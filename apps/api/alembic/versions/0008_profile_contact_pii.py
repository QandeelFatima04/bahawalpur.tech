"""add phone, email, address to candidate_profiles

Revision ID: 0008_profile_contact_pii
Revises: 0007_job_extra_and_ai_log
Create Date: 2026-04-26
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0008_profile_contact_pii"
down_revision: Union[str, None] = "0007_job_extra_and_ai_log"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


NEW_COLUMNS = [
    ("phone", sa.String(length=50)),
    ("email", sa.String(length=255)),
    ("address", sa.Text()),
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
