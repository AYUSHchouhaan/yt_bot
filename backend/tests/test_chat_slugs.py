import re
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
import pytest
from httpx import AsyncClient
from langchain_core.messages import AIMessage
from sqlalchemy import delete, select
from sqlalchemy import text as sa_text

from app.config import settings
from app.db import SessionLocal, engine
from app.models import AppUser, Chat

TEST_SECRET = "test-secret-0123456789abcdefghijklmnopqrstuv"
SLUG_RE = re.compile(r"^\d{18,24}$")


@pytest.fixture(autouse=True)
def local_jwt(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "supabase_jwks_url", "")
    monkeypatch.setattr(settings, "supabase_jwt_secret", TEST_SECRET)


@pytest.fixture
async def cleanup_users() -> list[str]:
    created: list[str] = []
    yield created
    if created:
        async with engine.begin() as conn:
            await conn.execute(
                delete(AppUser).where(AppUser.supabase_id.in_(created))
            )


def make_token(sub: str, *, expires_in: int = 3600) -> str:
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
        TEST_SECRET,
        algorithm="HS256",
    )


def _auth_headers(sub: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {make_token(sub)}"}


def _client_slug() -> str:
    return f"9{uuid4().int}"[:20].ljust(20, "7")


class _FakeLLM:
    def bind_tools(self, tools: object) -> "_FakeLLM":
        return self

    async def ainvoke(self, messages: object, **kwargs: object) -> AIMessage:
        return AIMessage(content="Answer with citation [1].")


class _FakeChat:
    def __init__(self, *args: object, **kwargs: object) -> None:
        pass

    def bind_tools(self, tools: object) -> _FakeLLM:
        return _FakeLLM()


def _setup_fake_llm(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.services.chat.graph.ChatOpenAI", _FakeChat)


async def _delete_checkpoints(slug: str) -> None:
    """Checkpoints are keyed by the int PK, not the slug."""
    async with SessionLocal() as session:
        chat = (
            await session.execute(select(Chat).where(Chat.slug == slug))
        ).scalar_one()
        thread_pk = chat.id
    async with engine.begin() as conn:
        for table in ("checkpoint_writes", "checkpoint_blobs", "checkpoints"):
            await conn.execute(
                sa_text(f"DELETE FROM {table} WHERE thread_id = :tid"),
                {"tid": str(thread_pk)},
            )


async def test_post_chat_generates_slug_when_absent(
    client: AsyncClient,
    cleanup_users: list[str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    sub = f"test-{uuid4()}"
    cleanup_users.append(sub)
    _setup_fake_llm(monkeypatch)

    response = await client.post(
        "/chat",
        json={"message": "hello there", "scope": {"kind": "library"}},
        headers=_auth_headers(sub),
    )
    assert response.status_code == 200
    chat_id = response.json()["chat_id"]
    assert SLUG_RE.fullmatch(chat_id)

    await _delete_checkpoints(chat_id)


async def test_post_chat_adopts_client_slug(
    client: AsyncClient,
    cleanup_users: list[str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    sub = f"test-{uuid4()}"
    cleanup_users.append(sub)
    _setup_fake_llm(monkeypatch)
    slug = _client_slug()

    response = await client.post(
        "/chat",
        json={
            "message": "first message",
            "chat_id": slug,
            "scope": {"kind": "library"},
        },
        headers=_auth_headers(sub),
    )
    assert response.status_code == 200
    assert response.json()["chat_id"] == slug

    detail = await client.get(f"/chats/{slug}", headers=_auth_headers(sub))
    assert detail.status_code == 200
    assert detail.json()["id"] == slug
    assert detail.json()["title"] == "first message"

    listing = await client.get("/chats", headers=_auth_headers(sub))
    assert listing.status_code == 200
    assert [c["id"] for c in listing.json()] == [slug]

    await _delete_checkpoints(slug)


async def test_post_chat_continues_existing_chat_by_slug(
    client: AsyncClient,
    cleanup_users: list[str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    sub = f"test-{uuid4()}"
    cleanup_users.append(sub)
    _setup_fake_llm(monkeypatch)
    slug = _client_slug()
    headers = _auth_headers(sub)

    first = await client.post(
        "/chat",
        json={
            "message": "first message",
            "chat_id": slug,
            "scope": {"kind": "library"},
        },
        headers=headers,
    )
    assert first.status_code == 200

    second = await client.post(
        "/chat",
        json={
            "message": "second message",
            "chat_id": slug,
            "scope": {"kind": "library"},
        },
        headers=headers,
    )
    assert second.status_code == 200
    assert second.json()["chat_id"] == slug

    detail = await client.get(f"/chats/{slug}", headers=headers)
    assert detail.status_code == 200
    msgs = detail.json()["messages"]
    assert [m["role"] for m in msgs] == ["user", "assistant", "user", "assistant"]
    assert detail.json()["title"] == "first message"

    async with SessionLocal() as session:
        rows = (
            await session.execute(select(Chat).where(Chat.slug == slug))
        ).scalars()
        chats = list(rows)
    assert len(chats) == 1  # second call continued, not re-created

    await _delete_checkpoints(slug)


async def test_invalid_chat_ids_rejected(
    client: AsyncClient,
    cleanup_users: list[str],
) -> None:
    sub = f"test-{uuid4()}"
    cleanup_users.append(sub)
    headers = _auth_headers(sub)

    for bad in ["abc", "12345", "9" * 25, "12 345678901234567890"]:
        response = await client.post(
            "/chat",
            json={
                "message": "hello",
                "chat_id": bad,
                "scope": {"kind": "library"},
            },
            headers=headers,
        )
        assert response.status_code == 422, bad


async def test_slug_collision_returns_409(
    client: AsyncClient,
    cleanup_users: list[str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    sub_a = f"test-{uuid4()}"
    sub_b = f"test-{uuid4()}"
    cleanup_users.extend([sub_a, sub_b])
    _setup_fake_llm(monkeypatch)
    slug = _client_slug()

    first = await client.post(
        "/chat",
        json={
            "message": "user A message",
            "chat_id": slug,
            "scope": {"kind": "library"},
        },
        headers=_auth_headers(sub_a),
    )
    assert first.status_code == 200
    assert first.json()["chat_id"] == slug

    second = await client.post(
        "/chat",
        json={
            "message": "user B message",
            "chat_id": slug,
            "scope": {"kind": "library"},
        },
        headers=_auth_headers(sub_b),
    )
    assert second.status_code == 409

    await _delete_checkpoints(slug)


async def test_get_chat_by_slug_scoped_to_user(
    client: AsyncClient,
    cleanup_users: list[str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    sub_a = f"test-{uuid4()}"
    sub_b = f"test-{uuid4()}"
    cleanup_users.extend([sub_a, sub_b])
    _setup_fake_llm(monkeypatch)
    slug = _client_slug()

    created = await client.post(
        "/chat",
        json={
            "message": "user A message",
            "chat_id": slug,
            "scope": {"kind": "library"},
        },
        headers=_auth_headers(sub_a),
    )
    assert created.status_code == 200

    # Another user cannot read the chat by its slug.
    foreign = await client.get(f"/chats/{slug}", headers=_auth_headers(sub_b))
    assert foreign.status_code == 404

    # Old integer-style URLs are gone.
    owner = await client.get(f"/chats/{slug}", headers=_auth_headers(sub_a))
    assert owner.status_code == 200

    await _delete_checkpoints(slug)
