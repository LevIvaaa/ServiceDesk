"""Add English name translations to users

Revision ID: 004_add_user_name_translations
Revises: 003_add_language
Create Date: 2026-01-22 11:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '004_add_user_name_translations'
down_revision = '003_add_language'
branch_labels = None
depends_on = None


def upgrade():
    # Add English name columns
    op.add_column('users', sa.Column('first_name_en', sa.String(100), nullable=True))
    op.add_column('users', sa.Column('last_name_en', sa.String(100), nullable=True))


def downgrade():
    op.drop_column('users', 'last_name_en')
    op.drop_column('users', 'first_name_en')
