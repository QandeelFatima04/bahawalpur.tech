"""add lifecycle_status to jobs

Revision ID: 0003_job_lifecycle_status
Revises: 0002_job_hiring_limit
Create Date: 2026-04-17
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0003_job_lifecycle_status"
down_revision: Union[str, None] = "0002_job_hiring_limit"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = {c["name"] for c in inspector.get_columns("jobs")}
    if "lifecycle_status" in existing:
        return

    lifecycle_enum = sa.Enum("active", "paused", "inactive", name="joblifecyclestatus")
    lifecycle_enum.create(bind, checkfirst=True)

    op.add_column(
        "jobs",
        sa.Column("lifecycle_status", lifecycle_enum, nullable=True),
    )

    jobs = sa.table(
        "jobs",
        sa.column("is_active", sa.Boolean),
        sa.column("lifecycle_status", lifecycle_enum),
    )
    op.execute(jobs.update().where(jobs.c.is_active.is_(True)).values(lifecycle_status="active"))
    op.execute(jobs.update().where(jobs.c.is_active.is_(False)).values(lifecycle_status="inactive"))

    op.alter_column("jobs", "lifecycle_status", nullable=False, server_default="active")
    op.create_index("ix_jobs_lifecycle_status", "jobs", ["lifecycle_status"])


def downgrade() -> None:
    op.drop_index("ix_jobs_lifecycle_status", table_name="jobs")
    op.drop_column("jobs", "lifecycle_status")
    sa.Enum(name="joblifecyclestatus").drop(op.get_bind(), checkfirst=True)
