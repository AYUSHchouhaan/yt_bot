from typing import Any

from fastapi import APIRouter, HTTPException, status
from langchain_core.messages import HumanMessage
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from sqlalchemy import select

from app.auth.deps import DbUserDep, SessionDep
from app.config import settings
from app.models import Chat, Message, Playlist, Video
from app.schemas.chat_detail import ChatDetail
from app.schemas.chat_request import ChatRequest
from app.schemas.chat_response import ChatResponse
from app.schemas.chat_summary import ChatSummary
from app.schemas.library import LibraryOut
from app.schemas.message_out import MessageOut
from app.schemas.playlist_out import PlaylistOut
from app.schemas.video_out import VideoOut
from app.services.chat import (
    build_compiled_graph,
    create_checkpointer_conn,
    psycopg_url,
)
from app.services.retrieval import ScopeError, resolve_scope

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def send_message(
    body: ChatRequest, user: DbUserDep, session: SessionDep
) -> ChatResponse:
    scope: dict[str, Any] = {"kind": body.scope.kind, "id": body.scope.id}

    try:
        resolved = await resolve_scope(session, user.id, scope)
    except ScopeError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    if body.chat_id:
        chat = (
            await session.execute(
                select(Chat).where(Chat.id == body.chat_id, Chat.user_id == user.id)
            )
        ).scalar_one_or_none()
        if chat is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found"
            )
    else:
        video_id = body.scope.id if body.scope.kind == "video" else None
        playlist_id = body.scope.id if body.scope.kind == "playlist" else None
        chat = Chat(
            user_id=user.id,
            video_id=video_id,
            playlist_id=playlist_id,
            title=body.message[:100] if body.message else None,
        )
        session.add(chat)
        await session.flush()

    session.add(Message(chat_id=chat.id, role="user", content=body.message))
    await session.flush()
    await session.commit()

    conn = await create_checkpointer_conn(psycopg_url(settings.database_url))
    try:
        checkpointer = AsyncPostgresSaver(conn)
        await checkpointer.setup()
        graph = await build_compiled_graph(
            session,
            user.id,
            scope,
            checkpointer=checkpointer,
            resolved=resolved,
        )
        config: dict[str, Any] = {"configurable": {"thread_id": str(chat.id)}}
        result = await graph.ainvoke(
            {
                "messages": [HumanMessage(content=body.message)],
                "query": body.message,
                "scope": scope,
                "user_id": user.id,
                "chat_id": chat.id,
                "context": [],
                "citations": [],
            },
            config=config,
        )
    finally:
        await conn.close()

    answer = ""
    for msg in reversed(result.get("messages", [])):
        content = getattr(msg, "content", "")
        if content:
            answer = content
            break

    citations = result.get("citations") or []

    session.add(
        Message(chat_id=chat.id, role="assistant", content=answer, citations=citations)
    )
    await session.commit()

    return ChatResponse(chat_id=chat.id, answer=answer, citations=citations)


@router.get("/chats", response_model=list[ChatSummary])
async def list_chats(user: DbUserDep, session: SessionDep) -> list[Chat]:
    result = await session.execute(
        select(Chat).where(Chat.user_id == user.id).order_by(Chat.id.desc())
    )
    return list(result.scalars().all())


@router.get("/chats/{chat_id}", response_model=ChatDetail)
async def get_chat(chat_id: int, user: DbUserDep, session: SessionDep) -> ChatDetail:
    chat = (
        await session.execute(
            select(Chat).where(Chat.id == chat_id, Chat.user_id == user.id)
        )
    ).scalar_one_or_none()
    if chat is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found"
        )

    msgs = (
        await session.execute(
            select(Message).where(Message.chat_id == chat_id).order_by(Message.id)
        )
    ).scalars().all()

    return ChatDetail(
        id=chat.id,
        title=chat.title,
        video_id=chat.video_id,
        playlist_id=chat.playlist_id,
        messages=[MessageOut.model_validate(m) for m in msgs],
    )


@router.get("/library", response_model=LibraryOut)
async def get_library(user: DbUserDep, session: SessionDep) -> LibraryOut:
    videos = (
        await session.execute(
            select(Video).where(Video.user_id == user.id).order_by(Video.id.desc())
        )
    ).scalars().all()

    playlists = (
        await session.execute(
            select(Playlist)
            .where(Playlist.user_id == user.id)
            .order_by(Playlist.id.desc())
        )
    ).scalars().all()

    return LibraryOut(
        videos=[VideoOut.model_validate(v) for v in videos],
        playlists=[PlaylistOut.model_validate(p) for p in playlists],
    )
