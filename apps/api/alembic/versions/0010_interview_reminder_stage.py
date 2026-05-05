"""add reminder_stage column to interview_requests

Revision ID: 0010_interview_reminder_stage
Revises: 0009_email_verification
Create Date: 2026-05-05
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0010_interview_reminder_stage"
down_revision: Union[str, None] = "0009_email_verification"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    existing = {c["name"] for c in sa.inspect(bind).get_columns("interview_requests")}
    if "reminder_stage" not in existing:
        op.add_column(
            "interview_requests",
            sa.Column("reminder_stage", sa.SmallInteger(), nullable=True),
        )
        op.execute(sa.text("UPDATE interview_requests SET reminder_stage = 0 WHERE reminder_stage IS NULL"))
        op.alter_column(
            "interview_requests",
            "reminder_stage",
            nullable=False,
            server_default=sa.text("0"),
        )


def downgrade() -> None:
    op.drop_column("interview_requests", "reminder_stage")
