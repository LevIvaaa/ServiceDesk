"""add user name en fields

Revision ID: 008
Revises: 007
Create Date: 2026-01-28

"""
from alembic import op
import sqlalchemy as sa

revision = '008'
down_revision = '007'

def upgrade():
    op.add_column('users', sa.Column('first_name_en', sa.String(100), nullable=True))
    op.add_column('users', sa.Column('last_name_en', sa.String(100), nullable=True))

def downgrade():
    op.drop_column('users', 'last_name_en')
    op.drop_column('users', 'first_name_en')
