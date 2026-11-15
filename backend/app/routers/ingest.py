import asyncio
import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, update
from starlette.concurrency import run_in_threadpool

from app.auth.deps import DbUserDep, SessionDep
from app.db import SessionLocal
from app.models import Chunk, IngestJob, Playlist, Video
from app.services.ingest import ingest_video
from app.services.youtube import fetch_playlist, parse_playlist_url, parse_youtube_url

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ingest", tags=["ingest"])

_PLAYLIST_CONCURRENCY = 3
_PLAYLIST_ENUMERATION_TIMEOUT_S = 180


class IngestRequest(BaseModel):
    url: str


class IngestResponse(BaseModel):
    video_id: int
    job_id: int | None
    status: str
    playlist_id: int | None = None


class PlaylistIngestResponse(BaseModel):
    playlist_id: int
    job_id: int | None
    total: int
    status: str


@router.post(
    "/video",
    response_model=IngestResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def create_ingest(
    body: IngestRequest,
    user: DbUserDep,
    session: SessionDep,
    background_tasks: BackgroundTasks,
) -> IngestResponse:
    youtube_id = parse_youtube_url(body.url)
    if youtube_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid YouTube URL",
        )

    existing = (
        await session.execute(
            select(Video).where(
                Video.user_id == user.id,
                Video.youtube_video_id == youtube_id,
            )
        )
    ).scalar_one_or_none()

    if existing is not None and existing.status == "ready":
        return IngestResponse(
            video_id=existing.id,
            job_id=None,
            status="already_ready",
            playlist_id=existing.playlist_id,
        )

    if existing is not None:
        existing.status = "queued"
        existing.error = None
        video = existing
    else:
        video = Video(
            user_id=user.id,
            youtube_video_id=youtube_id,
            status="queued",
        )
        session.add(video)

    job = IngestJob(
        user_id=user.id,
        kind="video",
        target=youtube_id,
        total=1,
        done=0,
        status="queued",
    )
    session.add(job)
    await session.flush()

    await session.commit()

    background_tasks.add_task(_run_ingest, video.id, job.id, user.id)

    return IngestResponse(
        video_id=video.id,
        job_id=job.id,
        status="queued",
        playlist_id=video.playlist_id,
    )


@router.post(
    "/playlist",
    response_model=PlaylistIngestResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def create_playlist_ingest(
    body: IngestRequest,
    user: DbUserDep,
    session: SessionDep,
    background_tasks: BackgroundTasks,
) -> PlaylistIngestResponse:
    playlist_youtube_id = parse_playlist_url(body.url)
    if playlist_youtube_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid YouTube playlist URL",
        )

    try:
        info = await asyncio.wait_for(
            run_in_threadpool(fetch_playlist, playlist_youtube_id),
            timeout=_PLAYLIST_ENUMERATION_TIMEOUT_S,
        )
    except Exception as exc:
        logger.exception("Failed to enumerate playlist %s", playlist_youtube_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not fetch playlist: {exc}",
        ) from exc

    playlist = (
        await session.execute(
            select(Playlist).where(
                Playlist.user_id == user.id,
                Playlist.youtube_playlist_id == playlist_youtube_id,
            )
        )
    ).scalar_one_or_none()

    if playlist is None:
        playlist = Playlist(
            user_id=user.id,
            youtube_playlist_id=playlist_youtube_id,
        )
        session.add(playlist)
        await session.flush()

    playlist.title = info.title
    playlist.item_count = len(info.items)

    pending: list[int] = []
    for item in info.items:
        video = (
            await session.execute(
                select(Video).where(
                    Video.user_id == user.id,
                    Video.youtube_video_id == item.youtube_video_id,
                )
            )
        ).scalar_one_or_none()

        if video is None:
            video = Video(
                user_id=user.id,
                playlist_id=playlist.id,
                youtube_video_id=item.youtube_video_id,
                title=item.title,
                status="queued",
            )
            session.add(video)
            await session.flush()
            pending.append(video.id)
            continue

        moved = video.playlist_id != playlist.id
        video.playlist_id = playlist.id
        if video.status == "ready":
            if moved:
                await session.execute(
                    update(Chunk)
                    .where(Chunk.video_id == video.id)
                    .values(playlist_id=playlist.id)
                )
        else:
            video.status = "queued"
            video.error = None
            pending.append(video.id)

    if not pending:
        await session.commit()
        return PlaylistIngestResponse(
            playlist_id=playlist.id,
            job_id=None,
            total=len(info.items),
            status="already_ready",
        )

    job = IngestJob(
        user_id=user.id,
        kind="playlist",
        target=playlist_youtube_id,
        total=len(info.items),
        done=len(info.items) - len(pending),
        status="queued",
    )
    session.add(job)
    await session.flush()
    job_id = job.id

    await session.commit()

    background_tasks.add_task(
        _run_playlist_ingest, playlist.id, job_id, user.id, pending
    )

    return PlaylistIngestResponse(
        playlist_id=playlist.id,
        job_id=job_id,
        total=len(info.items),
        status="queued",
    )


async def _run_ingest(video_id: int, job_id: int, user_id: int) -> None:
    async with SessionLocal() as session:
        job = (
            await session.execute(
                select(IngestJob).where(IngestJob.id == job_id)
            )
        ).scalar_one()
        job.status = "running"
        await session.commit()

        try:
            await ingest_video(video_id, user_id, session)
            job.status = "done"
            job.done = job.total
            await session.commit()
        except Exception:
            logger.exception("Ingestion failed for video %s", video_id)
            await session.rollback()
            job = (
                await session.execute(
                    select(IngestJob).where(IngestJob.id == job_id)
                )
            ).scalar_one()
            job.status = "failed"
            await session.commit()


async def _run_playlist_ingest(
    playlist_id: int, job_id: int, user_id: int, video_ids: list[int]
) -> None:
    async with SessionLocal() as session:
        job = (
            await session.execute(
                select(IngestJob).where(IngestJob.id == job_id)
            )
        ).scalar_one()
        job.status = "running"
        await session.commit()

    semaphore = asyncio.Semaphore(_PLAYLIST_CONCURRENCY)

    async def process(video_id: int) -> bool:
        async with semaphore:
            ok = await _ingest_playlist_item(video_id, user_id)
            async with SessionLocal() as session:
                await session.execute(
                    update(IngestJob)
                    .where(IngestJob.id == job_id)
                    .values(done=IngestJob.done + 1)
                )
                await session.commit()
            return ok

    results = await asyncio.gather(
        *(process(video_id) for video_id in video_ids)
    )
    failed = results.count(False)

    async with SessionLocal() as session:
        job = (
            await session.execute(
                select(IngestJob).where(IngestJob.id == job_id)
            )
        ).scalar_one()
        if failed:
            job.status = "failed"
            job.error = f"{failed} of {len(results)} videos failed"
        else:
            job.status = "done"
        await session.commit()


async def _ingest_playlist_item(video_id: int, user_id: int) -> bool:
    async with SessionLocal() as session:
        try:
            await ingest_video(video_id, user_id, session)
            return True
        except Exception:
            logger.exception("Playlist item %s failed", video_id)
            return False
