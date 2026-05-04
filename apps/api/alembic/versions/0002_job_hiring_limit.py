"""add hiring_limit to jobs

Revision ID: 0002_job_hiring_limit
Revises: 0001_initial_schema
Create Date: 2026-04-17
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0002_job_hiring_limit"
down_revision: Union[str, None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = {c["name"] for c in inspector.get_columns("jobs")}
    if "hiring_limit" not in existing:
        op.add_column("jobs", sa.Column("hiring_limit", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("jobs", "hiring_limit")
