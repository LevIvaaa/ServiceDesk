"""fix user foreign keys

Revision ID: 013
Revises: 012
Create Date: 2026-02-18 14:10:00.000000

"""
from alembic import op

revision = '013'
down_revision = '012'
branch_labels = None
depends_on = None


def upgrade():
    # Drop existing foreign keys
    op.drop_constraint('tickets_assigned_user_id_fkey', 'tickets', type_='foreignkey')
    op.drop_constraint('tickets_created_by_id_fkey', 'tickets', type_='foreignkey')
    op.drop_constraint('ticket_comments_user_id_fkey', 'ticket_comments', type_='foreignkey')
    op.drop_constraint('ticket_attachments_uploaded_by_id_fkey', 'ticket_attachments', type_='foreignkey')
    op.drop_constraint('ticket_history_user_id_fkey', 'ticket_history', type_='foreignkey')
    
    # Recreate with SET NULL
    op.create_foreign_key('tickets_assigned_user_id_fkey', 'tickets', 'users', ['assigned_user_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('tickets_created_by_id_fkey', 'tickets', 'users', ['created_by_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('ticket_comments_user_id_fkey', 'ticket_comments', 'users', ['user_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('ticket_attachments_uploaded_by_id_fkey', 'ticket_attachments', 'users', ['uploaded_by_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('ticket_history_user_id_fkey', 'ticket_history', 'users', ['user_id'], ['id'], ondelete='SET NULL')


def downgrade():
    op.drop_constraint('tickets_assigned_user_id_fkey', 'tickets', type_='foreignkey')
    op.drop_constraint('tickets_created_by_id_fkey', 'tickets', type_='foreignkey')
    op.drop_constraint('ticket_comments_user_id_fkey', 'ticket_comments', type_='foreignkey')
    op.drop_constraint('ticket_attachments_uploaded_by_id_fkey', 'ticket_attachments', type_='foreignkey')
    op.drop_constraint('ticket_history_user_id_fkey', 'ticket_history', type_='foreignkey')
    
    op.create_foreign_key('tickets_assigned_user_id_fkey', 'tickets', 'users', ['assigned_user_id'], ['id'])
    op.create_foreign_key('tickets_created_by_id_fkey', 'tickets', 'users', ['created_by_id'], ['id'])
    op.create_foreign_key('ticket_comments_user_id_fkey', 'ticket_comments', 'users', ['user_id'], ['id'])
    op.create_foreign_key('ticket_attachments_uploaded_by_id_fkey', 'ticket_attachments', 'users', ['uploaded_by_id'], ['id'])
    op.create_foreign_key('ticket_history_user_id_fkey', 'ticket_history', 'users', ['user_id'], ['id'])
