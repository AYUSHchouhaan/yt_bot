from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import engine

TABLES = {
    "app_users",
    "playlists",
    "videos",
    "chunks",
    "ingest_jobs",
    "chats",
    "messages",
}


async def test_engine_connects() -> None:
    async with engine.connect() as conn:
        assert (await conn.execute(text("select 1"))).scalar() == 1


async def test_all_tables_exist(db_session: AsyncSession) -> None:
    tables = (
        await db_session.execute(
            text("select tablename from pg_tables where schemaname = 'public'")
        )
    ).scalars()
    assert TABLES <= set(tables)


async def test_pgvector_extension_enabled(db_session: AsyncSession) -> None:
    version = (
        await db_session.execute(
            text("select extversion from pg_extension where extname = 'vector'")
        )
    ).scalar()
    assert version is not None


async def test_chunk_columns_and_indexes(db_session: AsyncSession) -> None:
    columns = (
        await db_session.execute(
            text(
                """select attname, format_type(atttypid, atttypmod), attgenerated::text
                   from pg_attribute
                   where attrelid = 'chunks'::regclass
                     and attname in ('embedding', 'tsv')"""
            )
        )
    ).all()
    by_name = {name: (type_name, generated) for name, type_name, generated in columns}
    assert by_name["embedding"] == ("vector(1536)", "")
    assert by_name["tsv"] == ("tsvector", "s")

    index_defs = "\n".join(
        (
            await db_session.execute(
                text(
                    "select indexdef from pg_indexes "
                    "where schemaname = 'public' and tablename = 'chunks'"
                )
            )
        ).scalars()
    ).lower()
    assert "using hnsw (embedding vector_cosine_ops)" in index_defs
    assert "using gin (tsv)" in index_defs
