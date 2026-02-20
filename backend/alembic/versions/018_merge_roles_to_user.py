"""Merge sender and handler roles into single 'user' role

Revision ID: 018
Revises: 017
Create Date: 2026-02-20
"""
from alembic import op
import sqlalchemy as sa

revision = '018'
down_revision = '017'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    
    # 1. Check if 'user' role already exists
    user_role = conn.execute(
        sa.text("SELECT id FROM roles WHERE name = 'user'")
    ).fetchone()
    
    if user_role:
        user_role_id = user_role[0]
    else:
        # Create 'user' role
        conn.execute(
            sa.text("INSERT INTO roles (name, description, is_system) VALUES ('user', 'Користувач - створення та обробка тікетів', true)")
        )
        user_role_id = conn.execute(
            sa.text("SELECT id FROM roles WHERE name = 'user'")
        ).fetchone()[0]
    
    # 2. Get sender and handler role IDs
    sender_role = conn.execute(
        sa.text("SELECT id FROM roles WHERE name = 'sender'")
    ).fetchone()
    
    handler_role = conn.execute(
        sa.text("SELECT id FROM roles WHERE name = 'handler'")
    ).fetchone()
    
    # 3. Move all users from sender/handler to user role
    role_ids = []
    if sender_role:
        role_ids.append(sender_role[0])
    if handler_role:
        role_ids.append(handler_role[0])
    
    if role_ids:
        for old_role_id in role_ids:
            # Get users with old role
            users = conn.execute(
                sa.text("SELECT user_id FROM user_roles WHERE role_id = :rid"),
                {"rid": old_role_id}
            ).fetchall()
            
            for (uid,) in users:
                # Check if user already has 'user' role
                existing = conn.execute(
                    sa.text("SELECT 1 FROM user_roles WHERE user_id = :uid AND role_id = :rid"),
                    {"uid": uid, "rid": user_role_id}
                ).fetchone()
                
                if not existing:
                    conn.execute(
                        sa.text("INSERT INTO user_roles (user_id, role_id) VALUES (:uid, :rid)"),
                        {"uid": uid, "rid": user_role_id}
                    )
            
            # Remove old role assignments
            conn.execute(
                sa.text("DELETE FROM user_roles WHERE role_id = :rid"),
                {"rid": old_role_id}
            )
    
    # 4. Copy all permissions from sender+handler to user role (union)
    if role_ids:
        for old_role_id in role_ids:
            perms = conn.execute(
                sa.text("SELECT permission_id FROM role_permissions WHERE role_id = :rid"),
                {"rid": old_role_id}
            ).fetchall()
            
            for (pid,) in perms:
                existing = conn.execute(
                    sa.text("SELECT 1 FROM role_permissions WHERE role_id = :rid AND permission_id = :pid"),
                    {"rid": user_role_id, "pid": pid}
                ).fetchone()
                
                if not existing:
                    conn.execute(
                        sa.text("INSERT INTO role_permissions (role_id, permission_id) VALUES (:rid, :pid)"),
                        {"rid": user_role_id, "pid": pid}
                    )
    
    # 5. Remove old role permissions and roles
    if sender_role:
        conn.execute(sa.text("DELETE FROM role_permissions WHERE role_id = :rid"), {"rid": sender_role[0]})
        conn.execute(sa.text("DELETE FROM roles WHERE id = :rid"), {"rid": sender_role[0]})
    
    if handler_role:
        conn.execute(sa.text("DELETE FROM role_permissions WHERE role_id = :rid"), {"rid": handler_role[0]})
        conn.execute(sa.text("DELETE FROM roles WHERE id = :rid"), {"rid": handler_role[0]})
    
    # 6. Also clean up old operator/technician/manager roles if they exist
    for old_name in ['operator', 'technician', 'manager']:
        old_role = conn.execute(
            sa.text("SELECT id FROM roles WHERE name = :name"),
            {"name": old_name}
        ).fetchone()
        if old_role:
            conn.execute(sa.text("DELETE FROM user_roles WHERE role_id = :rid"), {"rid": old_role[0]})
            conn.execute(sa.text("DELETE FROM role_permissions WHERE role_id = :rid"), {"rid": old_role[0]})
            conn.execute(sa.text("DELETE FROM roles WHERE id = :rid"), {"rid": old_role[0]})


def downgrade() -> None:
    # Not reversible cleanly - would need to recreate sender/handler roles
    pass
