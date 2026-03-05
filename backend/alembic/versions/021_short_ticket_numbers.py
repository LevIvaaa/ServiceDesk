"""Convert ticket_number from EF-YYYY-NNNNNN to simple sequential numbers

Revision ID: 021
Revises: 020_update_statuses_per_tz
Create Date: 2026-03-05
"""
from alembic import op
import sqlalchemy as sa

revision = '021'
down_revision = '020'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Update existing tickets: assign sequential numbers ordered by id
    op.execute("""
        UPDATE tickets
        SET ticket_number = sub.row_num::text
        FROM (
            SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS row_num
            FROM tickets
        ) sub
        WHERE tickets.id = sub.id
    """)


def downgrade() -> None:
    # Cannot reliably restore old format, leave as-is
    pass
