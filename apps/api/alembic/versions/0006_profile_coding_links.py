"""add leetcode_url and hackerrank_url to candidate_profiles

Revision ID: 0006_profile_coding_links
Revises: 0005_interview_meeting_link
Create Date: 2026-04-25
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0006_profile_coding_links"
down_revision: Union[str, None] = "0005_interview_meeting_link"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


NEW_COLUMNS = [
    ("leetcode_url", sa.String(length=500)),
    ("hackerrank_url", sa.String(length=500)),
]


def upgrade() -> None:
    bind = op.get_bind()
    existing = {c["name"] for c in sa.inspect(bind).get_columns("candidate_profiles")}
    for name, type_ in NEW_COLUMNS:
        if name not in existing:
            op.add_column("candidate_profiles", sa.Column(name, type_, nullable=True))


def downgrade() -> None:
    for name, _ in NEW_COLUMNS:
        op.drop_column("candidate_profiles", name)
