"""Add external_id field to stations

Revision ID: 002_add_station_external_id
Revises: 001_initial
Create Date: 2025-12-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002_add_station_external_id'
down_revision: Union[str, None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add external_id column to stations table
    op.add_column('stations', sa.Column('external_id', sa.String(length=100), nullable=True))
    op.create_index('ix_stations_external_id', 'stations', ['external_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_stations_external_id', table_name='stations')
    op.drop_column('stations', 'external_id')
