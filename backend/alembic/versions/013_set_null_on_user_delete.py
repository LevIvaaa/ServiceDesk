"""set null on user delete

Revision ID: 013
Revises: 012
Create Date: 2026-02-18 16:10:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '013'
down_revision = '012'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop existing foreign keys and recreate with ON DELETE SET NULL
    
    # tickets.assigned_user_id
    op.drop_constraint('tickets_assigned_user_id_fkey', 'tickets', type_='foreignkey')
    op.create_foreign_key(
        'tickets_assigned_user_id_fkey',
        'tickets', 'users',
        ['assigned_user_id'], ['id'],
        ondelete='SET NULL'
    )
    
    # tickets.created_by_id - keep as is (NOT NULL, so we'll set to a system user or keep the ID)
    # Actually, let's keep created_by_id as is since tickets should always have a creator
    
    # ticket_comments.user_id
    op.drop_constraint('ticket_comments_user_id_fkey', 'ticket_comments', type_='foreignkey')
    op.create_foreign_key(
        'ticket_comments_user_id_fkey',
        'ticket_comments', 'users',
        ['user_id'], ['id'],
        ondelete='SET NULL'
    )
    
    # Make user_id nullable in ticket_comments
    op.alter_column('ticket_comments', 'user_id',
                    existing_type=sa.INTEGER(),
                    nullable=True)
    
    # ticket_attachments.uploaded_by_id
    op.drop_constraint('ticket_attachments_uploaded_by_id_fkey', 'ticket_attachments', type_='foreignkey')
    op.create_foreign_key(
        'ticket_attachments_uploaded_by_id_fkey',
        'ticket_attachments', 'users',
        ['uploaded_by_id'], ['id'],
        ondelete='SET NULL'
    )
    
    # Make uploaded_by_id nullable in ticket_attachments
    op.alter_column('ticket_attachments', 'uploaded_by_id',
                    existing_type=sa.INTEGER(),
                    nullable=True)
    
    # ticket_history.user_id
    op.drop_constraint('ticket_history_user_id_fkey', 'ticket_history', type_='foreignkey')
    op.create_foreign_key(
        'ticket_history_user_id_fkey',
        'ticket_history', 'users',
        ['user_id'], ['id'],
        ondelete='SET NULL'
    )
    
    # Make user_id nullable in ticket_history
    op.alter_column('ticket_history', 'user_id',
                    existing_type=sa.INTEGER(),
                    nullable=True)
    
    # notifications.user_id
    op.drop_constraint('notifications_user_id_fkey', 'notifications', type_='foreignkey')
    op.create_foreign_key(
        'notifications_user_id_fkey',
        'notifications', 'users',
        ['user_id'], ['id'],
        ondelete='CASCADE'  # Delete notifications when user is deleted
    )
    
    # audit_logs.user_id
    op.drop_constraint('audit_logs_user_id_fkey', 'audit_logs', type_='foreignkey')
    op.create_foreign_key(
        'audit_logs_user_id_fkey',
        'audit_logs', 'users',
        ['user_id'], ['id'],
        ondelete='SET NULL'
    )
    
    # Make user_id nullable in audit_logs
    op.alter_column('audit_logs', 'user_id',
                    existing_type=sa.INTEGER(),
                    nullable=True)


def downgrade() -> None:
    # Reverse the changes
    op.drop_constraint('tickets_assigned_user_id_fkey', 'tickets', type_='foreignkey')
    op.create_foreign_key(
        'tickets_assigned_user_id_fkey',
        'tickets', 'users',
        ['assigned_user_id'], ['id']
    )
    
    op.drop_constraint('ticket_comments_user_id_fkey', 'ticket_comments', type_='foreignkey')
    op.create_foreign_key(
        'ticket_comments_user_id_fkey',
        'ticket_comments', 'users',
        ['user_id'], ['id']
    )
    op.alter_column('ticket_comments', 'user_id',
                    existing_type=sa.INTEGER(),
                    nullable=False)
    
    op.drop_constraint('ticket_attachments_uploaded_by_id_fkey', 'ticket_attachments', type_='foreignkey')
    op.create_foreign_key(
        'ticket_attachments_uploaded_by_id_fkey',
        'ticket_attachments', 'users',
        ['uploaded_by_id'], ['id']
    )
    op.alter_column('ticket_attachments', 'uploaded_by_id',
                    existing_type=sa.INTEGER(),
                    nullable=False)
    
    op.drop_constraint('ticket_history_user_id_fkey', 'ticket_history', type_='foreignkey')
    op.create_foreign_key(
        'ticket_history_user_id_fkey',
        'ticket_history', 'users',
        ['user_id'], ['id']
    )
    op.alter_column('ticket_history', 'user_id',
                    existing_type=sa.INTEGER(),
                    nullable=False)
    
    op.drop_constraint('notifications_user_id_fkey', 'notifications', type_='foreignkey')
    op.create_foreign_key(
        'notifications_user_id_fkey',
        'notifications', 'users',
        ['user_id'], ['id']
    )
    
    op.drop_constraint('audit_logs_user_id_fkey', 'audit_logs', type_='foreignkey')
    op.create_foreign_key(
        'audit_logs_user_id_fkey',
        'audit_logs', 'users',
        ['user_id'], ['id']
    )
    op.alter_column('audit_logs', 'user_id',
                    existing_type=sa.INTEGER(),
                    nullable=False)
