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
    # Add station_number column if it doesn't exist
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('stations')]
    
    if 'station_number' not in columns:
        op.add_column('stations', sa.Column('station_number', sa.String(50), nullable=True))
    
    # Create index for faster search if it doesn't exist
    indexes = [idx['name'] for idx in inspector.get_indexes('stations')]
    if 'ix_stations_station_number' not in indexes:
        op.create_index('ix_stations_station_number', 'stations', ['station_number'])


def downgrade():
    op.drop_index('ix_stations_station_number', 'stations')
    op.drop_column('stations', 'station_number')
