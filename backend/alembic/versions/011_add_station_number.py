"""add station number

Revision ID: 011
Revises: 010
Create Date: 2026-02-10

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '011'
down_revision = '010'
branch_labels = None
depends_on = None


def upgrade():
    # Add station_number column
    op.add_column('stations', sa.Column('station_number', sa.String(50), nullable=True))
    
    # Create index for faster search
    op.create_index('ix_stations_station_number', 'stations', ['station_number'])


def downgrade():
    op.drop_index('ix_stations_station_number', 'stations')
    op.drop_column('stations', 'station_number')
