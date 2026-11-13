import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import uuid4

import jwt
import pytest
from httpx import AsyncClient
from sqlalchemy import delete, select

from app.config import settings
from app.db import SessionLocal, engine
from app.models import AppUser, Chunk, Playlist, Video
from app.services.youtube import Cue, PlaylistInfo, PlaylistItem

TEST_SECRET = "test-secret-0123456789abcdefghijklmnopqrstuv"
FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture(autouse=True)
def local_jwt(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "supabase_jwks_url", "")
    monkeypatch.setattr(settings, "supabase_jwt_secret", TEST_SECRET)


def make_token(sub: str, *, secret: str = TEST_SECRET, expires_in: int = 3600) -> str:
    now = datetime.now(UTC)
    return jwt.encode(
        {
            "sub": sub,
            "email": "test@example.com",
            "aud": "authenticated",
            "iat": now,
            "exp": now + timedelta(seconds=expires_in),
            "user_metadata": {
                "full_name": "Test User",
                "avatar_url": "https://example.com/avatar.png",
            },
        },
        secret,
        algorithm="HS256",
    )


def _auth_headers(sub: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {make_token(sub)}"}


def _load_cues() -> list[Cue]:
    data = json.loads((FIXTURES / "cues_punctuated.json").read_text(encoding="utf-8"))
    return [Cue(start=item["start"], end=item["end"], text=item["text"]) for item in data]


_PLAYLIST_URL = "https://www.youtube.com/playlist?list=PLtest123"
_VIDEO_IDS = ["aaaaaaaaaaa", "bbbbbbbbbbb", "ccccccccccc"]


@pytest.fixture(autouse=True)
def mock_external_calls(monkeypatch: pytest.MonkeyPatch) -> None:
    cues = _load_cues()

    def fake_fetch_playlist(playlist_id: str) -> PlaylistInfo:
        return PlaylistInfo(
            playlist_id=playlist_id,
            title="Test Playlist",
            items=[
                PlaylistItem(youtube_video_id=vid, title=f"Video {vid}")
                for vid in _VIDEO_IDS
            ],
        )

    def fake_fetch_metadata(video_id: str) -> dict:
        return {
            "video_id": video_id,
            "title": f"Video {video_id}",
            "channel": "Test Channel",
            "duration": 150,
            "thumbnail": "https://example.com/thumb.png",
        }

    def fake_fetch_transcript(
        video_id: str, languages: list[str] | None = None
    ) -> tuple[list[Cue], str]:
        return cues, "captions"

    def fake_embed_texts(
        texts: list[str], batch_size: int = 64
    ) -> list[list[float]]:
        return [[0.01] * 1536 for _ in texts]

    monkeypatch.setattr("app.routers.ingest.fetch_playlist", fake_fetch_playlist)
    monkeypatch.setattr("app.services.ingest.fetch_metadata", fake_fetch_metadata)
    monkeypatch.setattr("app.services.ingest.fetch_transcript", fake_fetch_transcript)
    monkeypatch.setattr("app.services.ingest.embed_texts", fake_embed_texts)


@pytest.fixture
async def cleanup_users() -> list[str]:
    created: list[str] = []
    yield created
    if created:
        async with engine.begin() as conn:
            await conn.execute(
                delete(AppUser).where(AppUser.supabase_id.in_(created))
            )


async def test_playlist_ingest_creates_videos_and_chunks(
    client: AsyncClient, cleanup_users: list[str]
) -> None:
    sub = f"test-{uuid4()}"
    cleanup_users.append(sub)
    headers = _auth_headers(sub)

    response = await client.post(
        "/ingest/playlist", json={"url": _PLAYLIST_URL}, headers=headers
    )
    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "queued"
    assert body["total"] == 3
    playlist_id = body["playlist_id"]
    job_id = body["job_id"]

    job = await client.get(f"/jobs/{job_id}", headers=headers)
    assert job.status_code == 200
    assert job.json()["status"] == "done"
    assert job.json()["done"] == 3

    async with SessionLocal() as session:
        playlist = (
            await session.execute(
                select(Playlist).where(Playlist.id == playlist_id)
            )
        ).scalar_one()
        assert playlist.title == "Test Playlist"
        assert playlist.item_count == 3

        videos = (
            await session.execute(
                select(Video)
                .where(Video.playlist_id == playlist_id)
                .order_by(Video.id)
            )
        ).scalars().all()
        assert len(videos) == 3
        assert [v.youtube_video_id for v in videos] == _VIDEO_IDS
        assert all(v.status == "ready" for v in videos)

        chunks = (
            await session.execute(
                select(Chunk).where(
                    Chunk.video_id.in_([v.id for v in videos])
                )
            )
        ).scalars().all()
        assert len(chunks) == 15
        assert all(c.playlist_id == playlist_id for c in chunks)


async def test_playlist_repost_is_idempotent(
    client: AsyncClient, cleanup_users: list[str]
) -> None:
    sub = f"test-{uuid4()}"
    cleanup_users.append(sub)
    headers = _auth_headers(sub)

    first = await client.post(
        "/ingest/playlist", json={"url": _PLAYLIST_URL}, headers=headers
    )
    assert first.status_code == 202
    headers = {"Authorization": headers["Authorization"]}
    await client.get(f"/jobs/{first.json()['job_id']}", headers=headers)

    second = await client.post(
        "/ingest/playlist", json={"url": _PLAYLIST_URL}, headers=headers
    )
    assert second.status_code == 202
    assert second.json()["status"] == "already_ready"
    assert second.json()["job_id"] is None
    assert second.json()["playlist_id"] == first.json()["playlist_id"]

    async with SessionLocal() as session:
        user = (
            await session.execute(
                select(AppUser).where(AppUser.supabase_id == sub)
            )
        ).scalar_one()
        videos = (
            await session.execute(select(Video).where(Video.user_id == user.id))
        ).scalars().all()
        assert len(videos) == 3


async def test_invalid_playlist_url_returns_400(
    client: AsyncClient, cleanup_users: list[str]
) -> None:
    sub = f"test-{uuid4()}"
    cleanup_users.append(sub)
    headers = _auth_headers(sub)

    response = await client.post(
        "/ingest/playlist",
        json={"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"},
        headers=headers,
    )
    assert response.status_code == 400
