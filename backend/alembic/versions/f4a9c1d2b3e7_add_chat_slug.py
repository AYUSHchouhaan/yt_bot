"""add chat slug

Revision ID: f4a9c1d2b3e7
Revises: b7f2fbcdcee6
Create Date: 2026-11-16 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f4a9c1d2b3e7"
down_revision: str | Sequence[str] | None = "b7f2fbcdcee6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add a public random slug to chats; int PK stays for FKs/thread_ids."""
    op.add_column("chats", sa.Column("slug", sa.String(length=32), nullable=True))
    # Backfill: random 18-digit numbers (1e17..1e18-1, no leading zeros).
    op.execute(
        "update chats set slug = (floor(random() * 9e17 + 1e17))::bigint::text"
    )
    op.alter_column(
        "chats", "slug", existing_type=sa.String(length=32), nullable=False
    )
    op.create_unique_constraint("chats_slug_key", "chats", ["slug"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("chats_slug_key", "chats", type_="unique")
    op.drop_column("chats", "slug")
