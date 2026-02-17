"""seed stations and operators data

Revision ID: 012
Revises: 011
Create Date: 2026-02-17

"""
from alembic import op
import os


# revision identifiers, used by Alembic.
revision = '012'
down_revision = '011'
branch_labels = None
depends_on = None


def upgrade():
    # Load and execute SQL file with stations and operators data
    sql_file_path = os.path.join(os.path.dirname(__file__), 'stations_seed_data.sql')
    
    with open(sql_file_path, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    # Execute the SQL
    op.execute(sql_content)


def downgrade():
    # Delete all stations and operators
    op.execute('DELETE FROM stations')
    op.execute('DELETE FROM operators')
