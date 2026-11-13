import pytest
from sqlalchemy import text as sa_text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AppUser, Chunk, Playlist, Video
from app.services.retrieval import ScopeError, hybrid_search, resolve_scope

_EMBEDDING = [0.01] * 1536


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


async def test_resolve_scope_rejects_video_inside_playlist(
    db_session: AsyncSession,
) -> None:
    user = await _seed_user(db_session, "scope-user-1")
    playlist = Playlist(
        user_id=user.id, youtube_playlist_id="PL1", title="P1", item_count=1
    )
    db_session.add(playlist)
    await db_session.flush()
    video = await _seed_video(
        db_session, user, "vid00000001", ["hello world"], playlist
    )

    with pytest.raises(ScopeError):
        await resolve_scope(db_session, user.id, {"kind": "video", "id": video.id})

    video_id, playlist_id = await resolve_scope(
        db_session, user.id, {"kind": "playlist", "id": playlist.id}
    )
    assert (video_id, playlist_id) == (None, playlist.id)


async def test_resolve_scope_video_outside_playlist(db_session: AsyncSession) -> None:
    user = await _seed_user(db_session, "scope-user-2")
    video = await _seed_video(db_session, user, "vid00000002", ["hello world"])

    video_id, playlist_id = await resolve_scope(
        db_session, user.id, {"kind": "video", "id": video.id}
    )
    assert (video_id, playlist_id) == (video.id, None)


async def test_hybrid_search_rejects_both_scopes(db_session: AsyncSession) -> None:
    with pytest.raises(ScopeError):
        await hybrid_search(db_session, "hello", user_id=1, video_id=1, playlist_id=2)


async def test_hybrid_search_playlist_scope_is_exclusive(
    db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        "app.services.retrieval.embed_query", lambda query: _EMBEDDING
    )

    user = await _seed_user(db_session, "scope-user-3")
    other = await _seed_user(db_session, "scope-user-4")

    playlist = Playlist(
        user_id=user.id, youtube_playlist_id="PL3", title="P3", item_count=2
    )
    db_session.add(playlist)
    await db_session.flush()

    await _seed_video(
        db_session,
        user,
        "plvideo0001",
        ["alpha transcript about quantum physics", "beta content"],
        playlist,
    )
    await _seed_video(db_session, user, "plainvideo1", ["standalone video text"])
    await _seed_video(
        db_session, other, "otheruser01", ["someone else private transcript"]
    )

    hits = await hybrid_search(
        db_session, "quantum physics", user_id=user.id, playlist_id=playlist.id
    )

    assert hits, "expected playlist chunks to be retrieved"
    assert all(hit["playlist_id"] == playlist.id for hit in hits)
    assert not any("standalone" in hit["text"] for hit in hits)
    assert not any("someone else" in hit["text"] for hit in hits)


async def test_hybrid_search_video_scope_excludes_playlist_videos(
    db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        "app.services.retrieval.embed_query", lambda query: _EMBEDDING
    )

    user = await _seed_user(db_session, "scope-user-5")
    playlist = Playlist(
        user_id=user.id, youtube_playlist_id="PL5", title="P5", item_count=1
    )
    db_session.add(playlist)
    await db_session.flush()

    standalone = await _seed_video(
        db_session, user, "standalone0", ["neural networks explained clearly"]
    )
    await _seed_video(
        db_session,
        user,
        "inplaylist1",
        ["neural networks inside a playlist"],
        playlist,
    )

    hits = await hybrid_search(
        db_session, "neural networks", user_id=user.id, video_id=standalone.id
    )

    assert hits
    assert all(hit["video_id"] == standalone.id for hit in hits)


async def test_rrf_ordering_stable(
    db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        "app.services.retrieval.embed_query", lambda query: _EMBEDDING
    )

    user = await _seed_user(db_session, "rrf-user-1")
    await _seed_video(
        db_session,
        user,
        "rrfvid00001",
        [
            "alpha content about quantum mechanics",
            "beta discussion on physics experiments",
            "gamma notes on chemistry reactions",
            "delta overview of biology cells",
        ],
    )
    await db_session.flush()

    hits1 = await hybrid_search(db_session, "quantum physics", user_id=user.id)
    hits2 = await hybrid_search(db_session, "quantum physics", user_id=user.id)

    assert hits1 and hits2
    assert [h["id"] for h in hits1] == [h["id"] for h in hits2]


async def test_hnsw_ef_search_applied(
    db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        "app.services.retrieval.embed_query", lambda query: _EMBEDDING
    )

    user = await _seed_user(db_session, "ef-user-1")
    await _seed_video(db_session, user, "efvid00001", ["unique content about databases"])
    await db_session.flush()

    await hybrid_search(db_session, "databases", user_id=user.id)

    result = await db_session.execute(sa_text("SHOW hnsw.ef_search"))
    assert result.scalar() == "100"


async def test_bm25_and_dense_both_surface(
    db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        "app.services.retrieval.embed_query", lambda query: _EMBEDDING
    )

    user = await _seed_user(db_session, "mixed-user-1")
    await _seed_video(
        db_session,
        user,
        "mixedvid01",
        [
            "The rare element Zythonium was first isolated in Norway",
            "Felines enjoy pursuing small rodents in the garden",
        ],
    )
    await db_session.flush()

    # BM25-only: exact proper noun surfaces via lexical CTE even with constant embeddings
    bm25_hits = await hybrid_search(db_session, "Zythonium", user_id=user.id)
    assert bm25_hits, "BM25 match should surface in top results"
    assert any("Zythonium" in h["text"] for h in bm25_hits)

    # Dense-only: paraphrase with no shared lexical stems surfaces via semantic CTE
    dense_hits = await hybrid_search(
        db_session, "kittens hunting rats", user_id=user.id
    )
    assert dense_hits, "dense match should surface in top results"
    assert any("Felines" in h["text"] for h in dense_hits)


async def test_top_hit_timestamp_accuracy(
    db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        "app.services.retrieval.embed_query", lambda query: _EMBEDDING
    )

    user = await _seed_user(db_session, "ts-user-1")
    # _seed_video places chunk i at start_s = i * 45.0; index 2 → 90.0 s
    await _seed_video(
        db_session,
        user,
        "tsvid00001",
        [
            "introductory remarks and welcome",
            "general discussion of the topic",
            "Zythonium was discovered here at this exact moment",
            "concluding thoughts and summary",
        ],
    )
    await db_session.flush()

    hits = await hybrid_search(db_session, "Zythonium", user_id=user.id)
    assert hits
    assert abs(hits[0]["start_s"] - 90.0) <= 30.0
