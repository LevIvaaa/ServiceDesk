"""add translations

Revision ID: 006
Revises: 005
Create Date: 2026-01-28

"""
from alembic import op
import sqlalchemy as sa

revision = '006'
down_revision = '005'

def upgrade():
    op.add_column('departments', sa.Column('name_en', sa.String(100), nullable=True))
    op.add_column('departments', sa.Column('description_en', sa.Text(), nullable=True))
    op.add_column('stations', sa.Column('name_en', sa.String(200), nullable=True))
    op.add_column('stations', sa.Column('address_en', sa.String(500), nullable=True))
    op.add_column('stations', sa.Column('city_en', sa.String(100), nullable=True))
    op.add_column('stations', sa.Column('region_en', sa.String(100), nullable=True))

def downgrade():
    op.drop_column('stations', 'region_en')
    op.drop_column('stations', 'city_en')
    op.drop_column('stations', 'address_en')
    op.drop_column('stations', 'name_en')
    op.drop_column('departments', 'description_en')
    op.drop_column('departments', 'name_en')
