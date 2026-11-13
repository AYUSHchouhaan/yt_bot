from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import psycopg


def psycopg_url(database_url: str) -> str:
    """Convert an asyncpg-style DATABASE_URL to one psycopg accepts.

    Strips ``+asyncpg`` from the scheme and translates the ``ssl`` query
    parameter (asyncpg) to ``sslmode`` (psycopg / libpq).
    """
    parsed = urlparse(database_url.replace("+asyncpg", ""))
    params = dict(parse_qsl(parsed.query))
    if "ssl" in params:
        params.setdefault("sslmode", params.pop("ssl"))
    return urlunparse(parsed._replace(query=urlencode(params)))


async def create_checkpointer_conn(database_url: str) -> psycopg.AsyncConnection:
    """Create an async psycopg connection for ``AsyncPostgresSaver``.

    ``autocommit`` is enabled so that ``setup()`` can run
    ``CREATE INDEX CONCURRENTLY`` outside a transaction block.
    """
    conn = await psycopg.AsyncConnection.connect(database_url)
    await conn.set_autocommit(True)
    return conn


__all__ = ["create_checkpointer_conn", "psycopg_url"]
