"""add ai_log_analysis to tickets

Revision ID: 005
Revises: 004_add_user_name_translations
Create Date: 2026-01-25

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004_add_user_name_translations'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add ai_log_analysis column to tickets table
    op.add_column('tickets', sa.Column('ai_log_analysis', postgresql.JSON(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    # Remove ai_log_analysis column from tickets table
    op.drop_column('tickets', 'ai_log_analysis')
