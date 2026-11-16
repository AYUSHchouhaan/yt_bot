import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import uuid4

import jwt
import pytest
from httpx import AsyncClient
from sqlalchemy import delete, event, select

from app.config import settings
from app.db import SessionLocal, engine
from app.models import AppUser, Chunk, Video
from app.services.youtube import Cue

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


_FAKE_META = {
    "title": "Test Video",
    "channel": "Test Channel",
    "duration": 150,
    "thumbnail": "https://example.com/thumb.png",
}

call_log: list[str] = []


@pytest.fixture(autouse=True)
def mock_external_calls(monkeypatch: pytest.MonkeyPatch) -> None:
    call_log.clear()
    cues = _load_cues()

    def fake_fetch_metadata(video_id: str) -> dict:
        call_log.append("fetch_metadata")
        return dict(_FAKE_META, video_id=video_id)

    def fake_fetch_transcript(
        video_id: str, languages: list[str] | None = None
    ) -> tuple[list[Cue], str]:
        call_log.append("fetch_transcript")
        return cues, "captions"

    def fake_embed_texts(
        texts: list[str], batch_size: int = 64
    ) -> list[list[float]]:
        call_log.append("embed_texts")
        return [[0.01] * 1536 for _ in texts]

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


async def test_ingest_full_pipeline(
    client: AsyncClient, cleanup_users: list[str]
) -> None:
    sub = f"test-{uuid4()}"
    cleanup_users.append(sub)
    headers = _auth_headers(sub)

    response = await client.post(
        "/ingest/video",
        json={"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"},
        headers=headers,
    )
    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "queued"
    video_id = body["video_id"]
    job_id = body["job_id"]

    job_resp = await client.get(f"/jobs/{job_id}", headers=headers)
    assert job_resp.status_code == 200
    assert job_resp.json()["status"] == "done"

    async with SessionLocal() as session:
        video = (
            await session.execute(select(Video).where(Video.id == video_id))
        ).scalar_one()
        assert video.status == "ready"
        assert video.title == "Test Video"
        assert video.channel == "Test Channel"
        assert video.transcript_source == "captions"
        assert video.full_text is not None
        assert video.segments is not None
        assert len(video.segments) == 30

        chunks = (
            await session.execute(
                select(Chunk)
                .where(Chunk.video_id == video_id)
                .order_by(Chunk.chunk_index)
            )
        ).scalars().all()
        assert len(chunks) == 5
        for chunk in chunks:
            assert len(chunk.embedding) == 1536
            assert chunk.end_s - chunk.start_s <= 45
        assert chunks[0].chunk_index == 0
        assert chunks[-1].chunk_index == 4

    assert call_log == ["fetch_metadata", "fetch_transcript", "embed_texts"]


async def test_ingest_status_transitions(
    client: AsyncClient, cleanup_users: list[str]
) -> None:
    sub = f"test-{uuid4()}"
    cleanup_users.append(sub)
    headers = _auth_headers(sub)

    transitions: list[str] = []

    def record_status(target, value, oldvalue, initiator) -> None:
        if value != oldvalue:
            transitions.append(value)

    event.listen(Video.status, "set", record_status)
    try:
        response = await client.post(
            "/ingest/video",
            json={"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"},
            headers=headers,
        )
        assert response.status_code == 202
        assert response.json()["status"] == "queued"

        job_id = response.json()["job_id"]
        job_resp = await client.get(f"/jobs/{job_id}", headers=headers)
        assert job_resp.json()["status"] == "done"
    finally:
        event.remove(Video.status, "set", record_status)

    assert "fetching" in transitions
    assert "embedding" in transitions
    assert transitions[-1] == "ready"
    assert transitions.index("fetching") < transitions.index("embedding")


async def test_repost_same_url_is_noop(
    client: AsyncClient, cleanup_users: list[str]
) -> None:
    sub = f"test-{uuid4()}"
    cleanup_users.append(sub)
    headers = _auth_headers(sub)
    url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

    first = await client.post("/ingest/video", json={"url": url}, headers=headers)
    assert first.status_code == 202
    assert first.json()["status"] == "queued"

    second = await client.post("/ingest/video", json={"url": url}, headers=headers)
    assert second.status_code == 202
    assert second.json()["status"] == "already_ready"
    assert second.json()["video_id"] == first.json()["video_id"]

    async with SessionLocal() as session:
        user = (
            await session.execute(
                select(AppUser).where(AppUser.supabase_id == sub)
            )
        ).scalar_one()
        videos = (
            await session.execute(select(Video).where(Video.user_id == user.id))
        ).scalars().all()
        assert len(videos) == 1


async def test_ingest_failure_sets_failed_status(
    client: AsyncClient,
    cleanup_users: list[str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    sub = f"test-{uuid4()}"
    cleanup_users.append(sub)
    headers = _auth_headers(sub)

    def failing_transcript(
        video_id: str, languages: list[str] | None = None
    ) -> tuple[list[Cue], str]:
        raise RuntimeError("Captions disabled")

    monkeypatch.setattr("app.services.ingest.fetch_transcript", failing_transcript)

    response = await client.post(
        "/ingest/video",
        json={"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"},
        headers=headers,
    )
    assert response.status_code == 202
    video_id = response.json()["video_id"]
    job_id = response.json()["job_id"]

    job_resp = await client.get(f"/jobs/{job_id}", headers=headers)
    assert job_resp.json()["status"] == "failed"

    async with SessionLocal() as session:
        video = (
            await session.execute(select(Video).where(Video.id == video_id))
        ).scalar_one()
        assert video.status == "failed"
        assert video.error is not None
        assert "Captions disabled" in video.error


async def test_invalid_url_returns_400(
    client: AsyncClient, cleanup_users: list[str]
) -> None:
    sub = f"test-{uuid4()}"
    cleanup_users.append(sub)
    headers = _auth_headers(sub)

    response = await client.post(
        "/ingest/video",
        json={"url": "not a youtube url"},
        headers=headers,
    )
    assert response.status_code == 400


async def test_jobs_requires_auth(client: AsyncClient) -> None:
    response = await client.get("/jobs/1")
    assert response.status_code == 401


async def test_job_not_found(
    client: AsyncClient, cleanup_users: list[str]
) -> None:
    sub = f"test-{uuid4()}"
    cleanup_users.append(sub)
    headers = _auth_headers(sub)

    response = await client.get("/jobs/999999", headers=headers)
    assert response.status_code == 404
