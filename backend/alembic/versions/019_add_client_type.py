"""Add client_type field to tickets

Revision ID: 019
Revises: 018
Create Date: 2026-02-20
"""
from alembic import op
import sqlalchemy as sa

revision = '019'
down_revision = '018'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('tickets', sa.Column('client_type', sa.String(10), nullable=True))


def downgrade() -> None:
    op.drop_column('tickets', 'client_type')
