import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import create_engine, make_url, pool

from alembic import context

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import app.models  # noqa: F401  # registers every table on Base.metadata
from app.config import settings
from app.db import Base

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def database_url() -> str:
    """The app's asyncpg URL, converted to a sync psycopg URL for Alembic.

    asyncpg wants `?ssl=require`; psycopg/libpq wants `?sslmode=require`.
    """
    url = make_url(settings.database_url)
    if "+asyncpg" in url.drivername:
        url = url.set(drivername=url.drivername.replace("+asyncpg", "+psycopg"))
    query = dict(url.query)
    ssl_mode = query.pop("ssl", None)
    if ssl_mode is not None and "sslmode" not in query:
        query["sslmode"] = ssl_mode
    return url.set(query=query).render_as_string(hide_password=False)


def run_migrations_offline() -> None:
    context.configure(
        url=database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_engine(database_url(), poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
