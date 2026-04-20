"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-04-17

Creates the entire current schema by delegating to SQLAlchemy's metadata. On a
greenfield project this keeps the migration a single source of truth with the
ORM models. Subsequent migrations should use explicit op.add_column /
op.create_table to evolve the schema from this starting point.
"""
from typing import Sequence, Union

from alembic import op

from app.database import Base
from app import models  # noqa: F401


revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
