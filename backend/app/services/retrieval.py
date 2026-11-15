from typing import Any

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.models import Playlist, Video
from app.schemas.scope_kind import ScopeKind
from app.services.embeddings import embed_query


class ScopeError(ValueError):
    pass


async def resolve_scope(
    session: AsyncSession, user_id: int, scope: dict[str, Any]
) -> tuple[int | None, int | None]:
    """Map a chat scope to a single retrieval filter.

    A video scope narrows retrieval to that video even when it belongs to a
    playlist; a playlist scope covers every video in the playlist.
    """
    kind: ScopeKind = scope.get("kind", "library")
    scope_id = scope.get("id")

    if kind == "library":
        return None, None

    if kind == "video":
        if scope_id is None:
            raise ScopeError("video scope requires an id")
        video = (
            await session.execute(
                select(Video).where(
                    Video.id == scope_id, Video.user_id == user_id
                )
            )
        ).scalar_one_or_none()
        if video is None:
            raise ScopeError(f"Video {scope_id} not found")
        return video.id, None

    if kind == "playlist":
        if scope_id is None:
            raise ScopeError("playlist scope requires an id")
        playlist = (
            await session.execute(
                select(Playlist).where(
                    Playlist.id == scope_id, Playlist.user_id == user_id
                )
            )
        ).scalar_one_or_none()
        if playlist is None:
            raise ScopeError(f"Playlist {scope_id} not found")
        return None, playlist.id

    raise ScopeError(f"Unsupported scope kind: {kind}")


_HYBRID_SQL = text(
    """
with sem as (
  select c.id,
         row_number() over (
           order by c.embedding <=> cast(:qvec as vector)
         ) as rnk
  from chunks c
  where c.user_id = :user_id
    and (cast(:video_id as bigint) is null or c.video_id = cast(:video_id as bigint))
    and (cast(:playlist_id as bigint) is null
         or c.playlist_id = cast(:playlist_id as bigint))
  order by c.embedding <=> cast(:qvec as vector)
  limit 40
),
lex as (
  select c.id,
         row_number() over (
           order by ts_rank_cd(c.tsv, websearch_to_tsquery('english', :q)) desc
         ) as rnk
  from chunks c
  where c.user_id = :user_id
    and (cast(:video_id as bigint) is null or c.video_id = cast(:video_id as bigint))
    and (cast(:playlist_id as bigint) is null
         or c.playlist_id = cast(:playlist_id as bigint))
    and c.tsv @@ websearch_to_tsquery('english', :q)
  limit 40
),
fused as (
  select id, sum(1.0 / (60 + rnk)) as score
  from (select id, rnk from sem union all select id, rnk from lex) u
  group by id
)
select c.id,
       c.text,
       c.start_s,
       c.end_s,
       c.video_id,
       c.playlist_id,
       v.youtube_video_id as youtube_id,
       v.title,
       f.score
from fused f
join chunks c on c.id = f.id
join videos v on v.id = c.video_id
order by f.score desc
limit :limit
"""
)


async def hybrid_search(
    session: AsyncSession,
    query: str,
    user_id: int,
    video_id: int | None = None,
    playlist_id: int | None = None,
    limit: int = 12,
) -> list[dict[str, Any]]:
    if video_id is not None and playlist_id is not None:
        raise ScopeError(
            "video_id and playlist_id are mutually exclusive; pass exactly one"
        )

    qvec = str(await run_in_threadpool(embed_query, query))
    await session.execute(text("set local hnsw.ef_search = 100"))
    rows = (
        await session.execute(
            _HYBRID_SQL,
            {
                "qvec": qvec,
                "q": query,
                "user_id": user_id,
                "video_id": video_id,
                "playlist_id": playlist_id,
                "limit": limit,
            },
        )
    ).mappings().all()

    return [
        {
            "id": row["id"],
            "text": row["text"],
            "start_s": row["start_s"],
            "end_s": row["end_s"],
            "video_id": row["video_id"],
            "playlist_id": row["playlist_id"],
            "youtube_id": row["youtube_id"],
            "title": row["title"],
            "score": float(row["score"]),
        }
        for row in rows
    ]
