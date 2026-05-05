"""add email verification fields to users

Revision ID: 0009_email_verification
Revises: 0008_profile_contact_pii
Create Date: 2026-05-05
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0009_email_verification"
down_revision: Union[str, None] = "0008_profile_contact_pii"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    existing = {c["name"] for c in sa.inspect(bind).get_columns("users")}

    if "email_verified" not in existing:
        # Add as nullable, backfill, then set NOT NULL — works on Postgres + SQLite.
        op.add_column("users", sa.Column("email_verified", sa.Boolean(), nullable=True))
        # Existing accounts (real students/companies/admins) keep working without re-verification.
        op.execute(sa.text("UPDATE users SET email_verified = TRUE WHERE email_verified IS NULL"))
        op.alter_column("users", "email_verified", nullable=False, server_default=sa.text("false"))
        op.create_index("ix_users_email_verified", "users", ["email_verified"])

    if "email_verification_token" not in existing:
        op.add_column("users", sa.Column("email_verification_token", sa.String(length=64), nullable=True))
        op.create_unique_constraint("uq_users_email_verification_token", "users", ["email_verification_token"])

    if "email_verification_sent_at" not in existing:
        op.add_column("users", sa.Column("email_verification_sent_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "email_verification_sent_at")
    op.drop_constraint("uq_users_email_verification_token", "users", type_="unique")
    op.drop_column("users", "email_verification_token")
    op.drop_index("ix_users_email_verified", table_name="users")
    op.drop_column("users", "email_verified")
