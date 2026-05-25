"""add coach_conversations and coach_messages tables

Revision ID: 0012_coach_tables
Revises: 0011_password_reset_tokens
Create Date: 2026-05-25
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0012_coach_tables"
down_revision: Union[str, None] = "0011_password_reset_tokens"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    if "coach_conversations" not in existing_tables:
        op.create_table(
            "coach_conversations",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )
        op.create_index("ix_coach_conversations_id", "coach_conversations", ["id"])
        op.create_index("ix_coach_conversations_user_id", "coach_conversations", ["user_id"])

    if "coach_messages" not in existing_tables:
        op.create_table(
            "coach_messages",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("conversation_id", sa.Integer(), sa.ForeignKey("coach_conversations.id"), nullable=False),
            sa.Column("role", sa.String(length=20), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )
        op.create_index("ix_coach_messages_id", "coach_messages", ["id"])
        op.create_index("ix_coach_messages_conversation_id", "coach_messages", ["conversation_id"])


def downgrade() -> None:
    op.drop_table("coach_messages")
    op.drop_table("coach_conversations")
