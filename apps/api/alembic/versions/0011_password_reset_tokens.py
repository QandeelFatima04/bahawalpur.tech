"""add password reset token fields to users

Revision ID: 0011_password_reset_tokens
Revises: 0010_interview_reminder_stage
Create Date: 2026-05-05
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0011_password_reset_tokens"
down_revision: Union[str, None] = "0010_interview_reminder_stage"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    existing = {c["name"] for c in sa.inspect(bind).get_columns("users")}

    if "password_reset_token" not in existing:
        op.add_column("users", sa.Column("password_reset_token", sa.String(length=64), nullable=True))
        op.create_unique_constraint("uq_users_password_reset_token", "users", ["password_reset_token"])

    if "password_reset_sent_at" not in existing:
        op.add_column("users", sa.Column("password_reset_sent_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "password_reset_sent_at")
    op.drop_constraint("uq_users_password_reset_token", "users", type_="unique")
    op.drop_column("users", "password_reset_token")
