"""add vehicle field to tickets

Revision ID: 010
Revises: 009
Create Date: 2026-02-08

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '010'
down_revision = '009'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add vehicle column to tickets table
    op.add_column('tickets', sa.Column('vehicle', sa.String(length=200), nullable=True))


def downgrade() -> None:
    # Remove vehicle column from tickets table
    op.drop_column('tickets', 'vehicle')
