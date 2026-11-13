import logging

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Chunk, Video
from app.services.chunker import build_chunks
from app.services.embeddings import content_hash, embed_texts
from app.services.youtube import clean_cues, fetch_metadata, fetch_transcript

logger = logging.getLogger(__name__)

_MAX_ERROR_LEN = 2000


async def ingest_video(video_id: int, user_id: int, session: AsyncSession) -> None:
    video = (
        await session.execute(select(Video).where(Video.id == video_id))
    ).scalar_one_or_none()
    if video is None or video.user_id != user_id:
        raise ValueError(f"Video {video_id} not found for user {user_id}")

    try:
        video.status = "fetching"
        await session.commit()

        meta = fetch_metadata(video.youtube_video_id)
        cues, source = fetch_transcript(video.youtube_video_id)
        cues = clean_cues(cues, source)

        video.title = meta["title"]
        video.channel = meta["channel"]
        video.duration_s = meta["duration"]
        video.thumbnail_url = meta["thumbnail"]
        video.transcript_source = source
        video.full_text = " ".join(cue.text for cue in cues)
        video.segments = [
            {"start": cue.start, "end": cue.end, "text": cue.text} for cue in cues
        ]
        await session.commit()

        video.status = "embedding"
        await session.commit()

        chunks = build_chunks(cues)
        await session.execute(delete(Chunk).where(Chunk.video_id == video_id))

        texts = [chunk.text for chunk in chunks]
        embeddings = embed_texts(texts) if texts else []

        rows = [
            {
                "video_id": video_id,
                "user_id": user_id,
                "playlist_id": video.playlist_id,
                "chunk_index": i,
                "text": chunk.text,
                "start_s": chunk.start_s,
                "end_s": chunk.end_s,
                "content_hash": content_hash(chunk.text),
                "embedding_model": settings.openai_embedding_model,
                "embedding": emb,
            }
            for i, (chunk, emb) in enumerate(
                zip(chunks, embeddings, strict=True)
            )
        ]
        if rows:
            await session.execute(insert(Chunk).values(rows))
        await session.commit()

        video.status = "ready"
        await session.commit()

    except Exception as exc:
        await session.rollback()
        video = (
            await session.execute(select(Video).where(Video.id == video_id))
        ).scalar_one()
        video.status = "failed"
        video.error = str(exc)[:_MAX_ERROR_LEN]
        await session.commit()
        raise
