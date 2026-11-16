import re
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
import pytest
from httpx import AsyncClient
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from sqlalchemy import delete, select
from sqlalchemy import text as sa_text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import SessionLocal, engine
from app.models import AppUser, Chat, Chunk, Playlist, Video
from app.services.chat import (
    build_compiled_graph,
    create_checkpointer_conn,
    psycopg_url,
)

TEST_SECRET = "test-secret-0123456789abcdefghijklmnopqrstuv"
_EMBEDDING = [0.01] * 1536

_FAKE_HITS = [
    {
        "id": 1,
        "text": "Quantum physics studies subatomic particles and their interactions.",
        "start_s": 0.0,
        "end_s": 45.0,
        "video_id": 1,
        "playlist_id": None,
        "youtube_id": "vid00000001",
        "title": "Physics Lecture",
        "score": 0.95,
    }
]


# ---------------------------------------------------------------------------
# Auth fixtures (mirrors test_ingest.py / test_auth.py)
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# Fake LLM
# ---------------------------------------------------------------------------


class FakeLLM:
    """Returns scripted AIMessages in order, cycling as a safety net."""

    def __init__(self, script: list[AIMessage]) -> None:
        self._script = list(script)
        self._idx = 0
        self.invoked = 0

    def bind_tools(self, tools: object) -> "FakeLLM":
        return self

    async def ainvoke(self, messages: object, **kwargs: object) -> AIMessage:
        self.invoked += 1
        msg = self._script[self._idx % len(self._script)]
        self._idx += 1
        return msg


def _tool_call(query: str = "quantum physics", call_id: str = "call_1") -> AIMessage:
    return AIMessage(
        content="",
        tool_calls=[
            {
                "name": "rag_search",
                "args": {"query": query},
                "id": call_id,
                "type": "tool_call",
            }
        ],
    )


def _answer(text: str = "The transcript discusses quantum physics [1].") -> AIMessage:
    return AIMessage(content=text)


# ---------------------------------------------------------------------------
# Seed helpers
# ---------------------------------------------------------------------------


async def _seed_user(session: AsyncSession, supabase_id: str) -> AppUser:
    user = AppUser(supabase_id=supabase_id, email=f"{supabase_id}@example.com")
    session.add(user)
    await session.flush()
    return user


async def _seed_video(
    session: AsyncSession,
    user: AppUser,
    youtube_id: str,
    texts: list[str],
    playlist: Playlist | None = None,
) -> Video:
    video = Video(
        user_id=user.id,
        playlist_id=playlist.id if playlist else None,
        youtube_video_id=youtube_id,
        title=f"Video {youtube_id}",
        status="ready",
    )
    session.add(video)
    await session.flush()
    for i, text in enumerate(texts):
        session.add(
            Chunk(
                video_id=video.id,
                user_id=user.id,
                playlist_id=playlist.id if playlist else None,
                chunk_index=i,
                text=text,
                start_s=i * 45.0,
                end_s=i * 45.0 + 45.0,
                content_hash=f"hash-{youtube_id}-{i}",
                embedding_model="text-embedding-3-small",
                embedding=_EMBEDDING,
            )
        )
    await session.flush()
    return video


def _fake_hybrid_search(hits: list[dict] | None = None):
    captured: list[dict] = []

    async def _impl(
        session, query, user_id, video_id=None, playlist_id=None, limit=12
    ):
        captured.append(
            {
                "query": query,
                "user_id": user_id,
                "video_id": video_id,
                "playlist_id": playlist_id,
            }
        )
        return hits if hits is not None else _FAKE_HITS

    _impl.captured = captured  # type: ignore[attr-defined]
    return _impl


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


async def test_tool_called_for_factual_query(
    db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    user = await _seed_user(db_session, "chat-factual-1")
    spy = _fake_hybrid_search()
    monkeypatch.setattr("app.services.rag_tool.hybrid_search", spy)

    llm = FakeLLM([_tool_call(), _answer()])
    graph = await build_compiled_graph(
        db_session,
        user.id,
        {"kind": "library"},
        checkpointer=MemorySaver(),
        llm=llm,
    )

    result = await graph.ainvoke(
        {
            "messages": [HumanMessage(content="What is quantum physics?")],
            "query": "What is quantum physics?",
            "scope": {"kind": "library"},
            "user_id": user.id,
            "chat_id": 1,
            "context": [],
            "citations": [],
        },
        config={"configurable": {"thread_id": "factual-1"}},
    )

    assert llm.invoked == 2
    assert len(spy.captured) == 1
    assert spy.captured[0]["query"] == "quantum physics"
    assert result["context"]
    assert result["citations"]


async def test_tool_not_called_for_chitchat(
    db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    user = await _seed_user(db_session, "chat-chitchat-1")
    spy = _fake_hybrid_search()
    monkeypatch.setattr("app.services.rag_tool.hybrid_search", spy)

    llm = FakeLLM([_answer("Hi! How can I help you with the video?")])
    graph = await build_compiled_graph(
        db_session,
        user.id,
        {"kind": "library"},
        checkpointer=MemorySaver(),
        llm=llm,
    )

    result = await graph.ainvoke(
        {
            "messages": [HumanMessage(content="hi")],
            "query": "hi",
            "scope": {"kind": "library"},
            "user_id": user.id,
            "chat_id": 2,
            "context": [],
            "citations": [],
        },
        config={"configurable": {"thread_id": "chitchat-1"}},
    )

    assert llm.invoked == 1
    assert len(spy.captured) == 0
    assert not result.get("citations")


async def test_multiturn_memory_via_postgres(
    db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    user = await _seed_user(db_session, "chat-mt-1")
    spy = _fake_hybrid_search()
    monkeypatch.setattr("app.services.rag_tool.hybrid_search", spy)

    thread_id = f"test-mt-{uuid4()}"
    llm = FakeLLM(
        [
            _tool_call(query="quantum physics"),
            _answer("Quantum physics is about subatomic particles [1]."),
            _answer("As I mentioned, it covers subatomic particles [1]."),
        ]
    )

    conn = await create_checkpointer_conn(psycopg_url(settings.database_url))
    try:
        checkpointer = AsyncPostgresSaver(conn)
        await checkpointer.setup()
        graph = await build_compiled_graph(
            db_session,
            user.id,
            {"kind": "library"},
            checkpointer=checkpointer,
            llm=llm,
        )
        config = {"configurable": {"thread_id": thread_id}}

        # Turn 1 — factual question triggers tool call
        await graph.ainvoke(
            {
                "messages": [HumanMessage(content="What is quantum physics?")],
                "query": "What is quantum physics?",
                "scope": {"kind": "library"},
                "user_id": user.id,
                "chat_id": 10,
                "context": [],
                "citations": [],
            },
            config=config,
        )

        # Turn 2 — follow-up; checkpointer restores prior context
        result = await graph.ainvoke(
            {
                "messages": [HumanMessage(content="Tell me more about that")],
                "query": "Tell me more about that",
            },
            config=config,
        )

        assert llm.invoked == 3
        assert result["context"], "context from turn 1 should survive the round-trip"
        assert result["citations"]
    finally:
        await conn.close()

    async with engine.begin() as conn:
        await conn.execute(
            sa_text("DELETE FROM checkpoint_writes WHERE thread_id = :tid"),
            {"tid": thread_id},
        )
        await conn.execute(
            sa_text("DELETE FROM checkpoint_blobs WHERE thread_id = :tid"),
            {"tid": thread_id},
        )
        await conn.execute(
            sa_text("DELETE FROM checkpoints WHERE thread_id = :tid"),
            {"tid": thread_id},
        )


async def test_citations_and_messages_rows(
    client: AsyncClient,
    cleanup_users: list[str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    sub = f"test-{uuid4()}"
    cleanup_users.append(sub)
    headers = _auth_headers(sub)

    spy = _fake_hybrid_search()
    monkeypatch.setattr("app.services.rag_tool.hybrid_search", spy)

    class _FakeChat:
        def __init__(self, *args, **kwargs) -> None:
            pass

        def bind_tools(self, tools: object) -> FakeLLM:
            return FakeLLM([_tool_call(), _answer("The answer is 42 [1].")])

    monkeypatch.setattr("app.services.chat.graph.ChatOpenAI", _FakeChat)

    response = await client.post(
        "/chat",
        json={
            "message": "What is the answer?",
            "scope": {"kind": "library"},
        },
        headers=headers,
    )
    assert response.status_code == 200
    body = response.json()
    chat_id = body["chat_id"]
    assert re.fullmatch(r"\d{18,24}", chat_id), "chat_id must be a random slug"
    assert body["answer"]
    assert body["citations"]
    assert body["citations"][0]["youtube_id"] == "vid00000001"

    detail = await client.get(f"/chats/{chat_id}", headers=headers)
    assert detail.status_code == 200
    msgs = detail.json()["messages"]
    assert len(msgs) == 2
    assert msgs[0]["role"] == "user"
    assert msgs[1]["role"] == "assistant"
    assert msgs[1]["citations"]

    # thread_id is the int PK; the API only exposes the slug.
    async with SessionLocal() as session:
        chat_row = (
            await session.execute(select(Chat).where(Chat.slug == chat_id))
        ).scalar_one()
        thread_pk = str(chat_row.id)

    async with engine.begin() as conn:
        await conn.execute(
            sa_text("DELETE FROM checkpoint_writes WHERE thread_id = :tid"),
            {"tid": thread_pk},
        )
        await conn.execute(
            sa_text("DELETE FROM checkpoint_blobs WHERE thread_id = :tid"),
            {"tid": thread_pk},
        )
        await conn.execute(
            sa_text("DELETE FROM checkpoints WHERE thread_id = :tid"),
            {"tid": thread_pk},
        )


async def test_scope_filtering_user_isolation(
    db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    user_a = await _seed_user(db_session, "scope-iso-a")
    user_b = await _seed_user(db_session, "scope-iso-b")
    await _seed_video(db_session, user_a, "vidA00001", ["user A private content"])
    await _seed_video(db_session, user_b, "vidB00001", ["user B private content"])

    spy = _fake_hybrid_search()
    monkeypatch.setattr("app.services.rag_tool.hybrid_search", spy)

    llm = FakeLLM([_tool_call(), _answer()])
    graph = await build_compiled_graph(
        db_session,
        user_a.id,
        {"kind": "library"},
        checkpointer=MemorySaver(),
        llm=llm,
    )

    await graph.ainvoke(
        {
            "messages": [HumanMessage(content="What is in my videos?")],
            "query": "What is in my videos?",
            "scope": {"kind": "library"},
            "user_id": user_a.id,
            "chat_id": 20,
            "context": [],
            "citations": [],
        },
        config={"configurable": {"thread_id": "scope-iso-1"}},
    )

    assert len(spy.captured) == 1
    assert spy.captured[0]["user_id"] == user_a.id
    assert user_b.id not in [c["user_id"] for c in spy.captured]


async def test_list_chats_and_library(
    client: AsyncClient,
    cleanup_users: list[str],
) -> None:
    sub = f"test-{uuid4()}"
    cleanup_users.append(sub)
    headers = _auth_headers(sub)

    resp = await client.get("/chats", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == []

    lib = await client.get("/library", headers=headers)
    assert lib.status_code == 200
    assert lib.json() == {"videos": [], "playlists": []}


async def test_chat_requires_auth(client: AsyncClient) -> None:
    response = await client.post(
        "/chat",
        json={"message": "hello", "scope": {"kind": "library"}},
    )
    assert response.status_code == 401


async def test_get_chat_not_found(
    client: AsyncClient,
    cleanup_users: list[str],
) -> None:
    sub = f"test-{uuid4()}"
    cleanup_users.append(sub)
    headers = _auth_headers(sub)

    response = await client.get("/chats/999999", headers=headers)
    assert response.status_code == 404
