"""add jobs.extra JSON column and ai_generation_logs table

Revision ID: 0007_job_extra_and_ai_log
Revises: 0006_profile_coding_links
Create Date: 2026-04-26
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0007_job_extra_and_ai_log"
down_revision: Union[str, None] = "0006_profile_coding_links"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    job_columns = {c["name"] for c in inspector.get_columns("jobs")}
    if "extra" not in job_columns:
        op.add_column("jobs", sa.Column("extra", sa.JSON(), nullable=True))

    if "ai_generation_logs" not in inspector.get_table_names():
        op.create_table(
            "ai_generation_logs",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
            sa.Column("role_name", sa.String(length=120), nullable=False),
            sa.Column("success", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("used_fallback", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("tokens_used", sa.Integer(), nullable=True),
            sa.Column("error", sa.String(length=500), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_ai_generation_logs_company_id", "ai_generation_logs", ["company_id"])
        op.create_index("ix_ai_generation_logs_created_at", "ai_generation_logs", ["created_at"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "ai_generation_logs" in inspector.get_table_names():
        op.drop_index("ix_ai_generation_logs_created_at", table_name="ai_generation_logs")
        op.drop_index("ix_ai_generation_logs_company_id", table_name="ai_generation_logs")
        op.drop_table("ai_generation_logs")

    job_columns = {c["name"] for c in inspector.get_columns("jobs")}
    if "extra" in job_columns:
        op.drop_column("jobs", "extra")
