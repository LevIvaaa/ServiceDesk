"""Add new ticket fields for incident type, port type, and source

Revision ID: 009_add_ticket_fields
Revises: 007_add_notifications
Create Date: 2026-01-28 19:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '009'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade():
    # Add incident_type field
    op.add_column('tickets', sa.Column('incident_type', sa.String(50), nullable=True))
    
    # Add port_type field
    op.add_column('tickets', sa.Column('port_type', sa.String(50), nullable=True))
    
    # Add contact_source field (джерело звернення)
    op.add_column('tickets', sa.Column('contact_source', sa.String(100), nullable=True))
    
    # Add station_logs field for OCPP logs
    op.add_column('tickets', sa.Column('station_logs', sa.Text(), nullable=True))
    
    # Create index on incident_type for faster filtering
    op.create_index('ix_tickets_incident_type', 'tickets', ['incident_type'])


def downgrade():
    op.drop_index('ix_tickets_incident_type', 'tickets')
    op.drop_column('tickets', 'station_logs')
    op.drop_column('tickets', 'contact_source')
    op.drop_column('tickets', 'port_type')
    op.drop_column('tickets', 'incident_type')
