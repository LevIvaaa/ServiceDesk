"""Add language field to knowledge articles

Revision ID: 003_add_language
Revises: 002_add_station_external_id
Create Date: 2026-01-22 09:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003_add_language'
down_revision = '002_add_station_external_id'
branch_labels = None
depends_on = None


def upgrade():
    # Add language column with default 'uk'
    op.add_column('knowledge_articles', sa.Column('language', sa.String(5), nullable=False, server_default='uk'))
    
    # Create index on language for faster queries
    op.create_index('ix_knowledge_articles_language', 'knowledge_articles', ['language'])


def downgrade():
    op.drop_index('ix_knowledge_articles_language', 'knowledge_articles')
    op.drop_column('knowledge_articles', 'language')
