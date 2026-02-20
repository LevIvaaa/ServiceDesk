"""Add sort_order to incident_types

Revision ID: 017
Revises: 016
Create Date: 2026-02-20
"""
from alembic import op
import sqlalchemy as sa

revision = "017"
down_revision = "016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("incident_types", sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False))
    # Set initial sort_order based on id
    op.execute("UPDATE incident_types SET sort_order = id")


def downgrade() -> None:
    op.drop_column("incident_types", "sort_order")
