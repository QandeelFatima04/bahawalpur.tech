"""add meeting_link to interview_requests

Revision ID: 0005_interview_meeting_link
Revises: 0004_profile_contact_fields
Create Date: 2026-04-18
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0005_interview_meeting_link"
down_revision: Union[str, None] = "0004_profile_contact_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    existing = {c["name"] for c in sa.inspect(bind).get_columns("interview_requests")}
    if "meeting_link" not in existing:
        op.add_column(
            "interview_requests",
            sa.Column("meeting_link", sa.String(length=512), nullable=True),
        )


def downgrade() -> None:
    op.drop_column("interview_requests", "meeting_link")
