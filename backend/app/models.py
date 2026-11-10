from datetime import datetime
from typing import Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    BigInteger,
    Computed,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class AppUser(Base):
    __tablename__ = "app_users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    supabase_id: Mapped[str] = mapped_column(String(255), unique=True)
    email: Mapped[str] = mapped_column(String(320))
    display_name: Mapped[str | None] = mapped_column(String(255))
    avatar_url: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Playlist(Base):
    __tablename__ = "playlists"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "youtube_playlist_id", name="playlists_user_playlist_key"
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("app_users.id", ondelete="CASCADE"), index=True
    )
    youtube_playlist_id: Mapped[str] = mapped_column(String(64))
    title: Mapped[str] = mapped_column(String(512), server_default="")
    item_count: Mapped[int] = mapped_column(Integer, server_default="0")


class Video(Base):
    __tablename__ = "videos"
    __table_args__ = (
        UniqueConstraint("user_id", "youtube_video_id", name="videos_user_video_key"),
        Index("videos_user_status_idx", "user_id", "status"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("app_users.id", ondelete="CASCADE"))
    playlist_id: Mapped[int | None] = mapped_column(
        ForeignKey("playlists.id", ondelete="CASCADE")
    )
    youtube_video_id: Mapped[str] = mapped_column(String(32))
    title: Mapped[str | None] = mapped_column(String(512))
    channel: Mapped[str | None] = mapped_column(String(255))
    duration_s: Mapped[int | None] = mapped_column(Integer)
    thumbnail_url: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), server_default="queued")
    error: Mapped[str | None] = mapped_column(Text)
    transcript_source: Mapped[str | None] = mapped_column(String(20))
    language: Mapped[str | None] = mapped_column(String(16))
    full_text: Mapped[str | None] = mapped_column(Text)
    segments: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB)


class Chunk(Base):
    __tablename__ = "chunks"
    __table_args__ = (
        UniqueConstraint("video_id", "chunk_index", name="chunks_video_chunk_idx"),
        Index("chunks_user_idx", "user_id"),
        Index("chunks_video_idx", "video_id"),
        Index("chunks_playlist_idx", "playlist_id"),
        Index("chunks_tsv_idx", "tsv", postgresql_using="gin"),
        Index(
            "chunks_embedding_idx",
            "embedding",
            postgresql_using="hnsw",
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    video_id: Mapped[int] = mapped_column(ForeignKey("videos.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(ForeignKey("app_users.id", ondelete="CASCADE"))
    playlist_id: Mapped[int | None] = mapped_column(
        ForeignKey("playlists.id", ondelete="CASCADE")
    )
    chunk_index: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)
    start_s: Mapped[float] = mapped_column(Float)
    end_s: Mapped[float] = mapped_column(Float)
    token_count: Mapped[int | None] = mapped_column(Integer)
    content_hash: Mapped[str | None] = mapped_column(String(64))
    embedding_model: Mapped[str | None] = mapped_column(String(64))
    embedding: Mapped[list[float]] = mapped_column(Vector(1536))
    tsv: Mapped[Any] = mapped_column(
        TSVECTOR, Computed("to_tsvector('english', text)", persisted=True)
    )


class IngestJob(Base):
    __tablename__ = "ingest_jobs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("app_users.id", ondelete="CASCADE"))
    kind: Mapped[str] = mapped_column(String(20))
    target: Mapped[str | None] = mapped_column(String(512))
    total: Mapped[int] = mapped_column(Integer, server_default="0")
    done: Mapped[int] = mapped_column(Integer, server_default="0")
    status: Mapped[str] = mapped_column(String(20), server_default="queued")
    error: Mapped[str | None] = mapped_column(Text)


class Chat(Base):
    __tablename__ = "chats"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("app_users.id", ondelete="CASCADE"), index=True
    )
    video_id: Mapped[int | None] = mapped_column(
        ForeignKey("videos.id", ondelete="CASCADE")
    )
    playlist_id: Mapped[int | None] = mapped_column(
        ForeignKey("playlists.id", ondelete="CASCADE")
    )
    title: Mapped[str | None] = mapped_column(String(512))


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (Index("messages_chat_idx", "chat_id", "id"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    chat_id: Mapped[int] = mapped_column(ForeignKey("chats.id", ondelete="CASCADE"))
    role: Mapped[str] = mapped_column(String(16))
    content: Mapped[str] = mapped_column(Text)
    citations: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB)
