"""Update statuses per TZ: remove open/resolved, add reviewing

Revision ID: 020
Revises: 019
Create Date: 2026-02-20
"""
from alembic import op
import sqlalchemy as sa

revision = '020'
down_revision = '019'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Map old statuses to new ones:
    # open -> in_progress (was intermediate, now goes straight to in_progress)
    # resolved -> reviewing (TZ says "Перевіряється")
    op.execute("UPDATE tickets SET status = 'in_progress' WHERE status = 'open'")
    op.execute("UPDATE tickets SET status = 'reviewing' WHERE status = 'resolved'")


def downgrade() -> None:
    op.execute("UPDATE tickets SET status = 'open' WHERE status = 'in_progress'")
    op.execute("UPDATE tickets SET status = 'resolved' WHERE status = 'reviewing'")
