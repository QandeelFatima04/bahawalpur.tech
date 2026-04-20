"""add optional contact fields to candidate_profiles

Revision ID: 0004_profile_contact_fields
Revises: 0003_job_lifecycle_status
Create Date: 2026-04-17
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0004_profile_contact_fields"
down_revision: Union[str, None] = "0003_job_lifecycle_status"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


NEW_COLUMNS = [
    ("current_location", sa.String(length=255)),
    ("linkedin_url", sa.String(length=500)),
    ("github_url", sa.String(length=500)),
    ("portfolio_url", sa.String(length=500)),
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
