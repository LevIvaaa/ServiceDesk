"""Setup all roles with proper permissions."""
import asyncio
from sqlalchemy import select, delete
from app.database import async_session_maker
from app.models.role import Role, Permission, RolePermission


# Роль: Адмін (Administrator)
ADMIN_PERMISSIONS = [
    # Stations management
    ('stations.view', 'Перегляд станцій', 'stations'),
    ('stations.create', 'Створення станцій', 'stations'),
    ('stations.edit', 'Редагування станцій', 'stations'),
    ('stations.delete', 'Видалення станцій', 'stations'),
    
    # Operators management
    ('operators.view', 'Перегляд операторів', 'operators'),
    ('operators.create', 'Створення операторів', 'operators'),
    ('operators.edit', 'Редагування операторів', 'operators'),
    ('operators.delete', 'Видалення операторів', 'operators'),
    
    # Departments management
    ('departments.view', 'Перегляд відділів', 'departments'),
    ('departments.create', 'Створення відділів', 'departments'),
    ('departments.edit', 'Редагування відділів', 'departments'),
    ('departments.delete', 'Видалення відділів', 'departments'),
    
    # Users management
    ('users.view', 'Перегляд користувачів', 'users'),
    ('users.create', 'Створення користувачів', 'users'),
    ('users.edit', 'Редагування користувачів', 'users'),
    ('users.delete', 'Видалення користувачів', 'users'),
    ('users.assign_roles', 'Призначення ролей', 'users'),
    ('users.reset_password', 'Скидання паролів', 'users'),
    
    # Tickets - full access
    ('tickets.view', 'Перегляд тікетів', 'tickets'),
    ('tickets.view_all', 'Перегляд всіх тікетів', 'tickets'),
    ('tickets.create', 'Створення тікетів', 'tickets'),
    ('tickets.edit', 'Редагування тікетів', 'tickets'),
    ('tickets.delete', 'Видалення тікетів', 'tickets'),
    ('tickets.assign', 'Призначення тікетів', 'tickets'),
    ('tickets.change_status', 'Зміна статусу тікетів', 'tickets'),
    ('tickets.comment', 'Коментування тікетів', 'tickets'),
    ('tickets.view_attachments', 'Перегляд вкладень', 'tickets'),
    ('tickets.upload_attachments', 'Завантаження вкладень', 'tickets'),
    ('tickets.delete_attachments', 'Видалення вкладень', 'tickets'),
    
    # Knowledge base
    ('knowledge_base.view', 'Перегляд бази знань', 'knowledge_base'),
    ('knowledge_base.create', 'Створення статей', 'knowledge_base'),
    ('knowledge_base.edit', 'Редагування статей', 'knowledge_base'),
    ('knowledge_base.delete', 'Видалення статей', 'knowledge_base'),
    
    # Roles management
    ('roles.view', 'Перегляд ролей', 'roles'),
    ('roles.create', 'Створення ролей', 'roles'),
    ('roles.edit', 'Редагування ролей', 'roles'),
    ('roles.delete', 'Видалення ролей', 'roles'),
]

# Роль: Відправник (Ticket Creator)
SENDER_PERMISSIONS = [
    # Tickets - create and view own
    ('tickets.view', 'Перегляд тікетів', 'tickets'),
    ('tickets.create', 'Створення тікетів', 'tickets'),
    ('tickets.delete', 'Видалення тікетів', 'tickets'),
    ('tickets.change_status', 'Зміна статусу тікетів', 'tickets'),
    ('tickets.comment', 'Коментування тікетів', 'tickets'),
    ('tickets.view_attachments', 'Перегляд вкладень', 'tickets'),
    ('tickets.upload_attachments', 'Завантаження вкладень', 'tickets'),
    
    # Stations - view only
    ('stations.view', 'Перегляд станцій', 'stations'),
    
    # Operators - view only
    ('operators.view', 'Перегляд операторів', 'operators'),
    
    # Departments - view only
    ('departments.view', 'Перегляд відділів', 'departments'),
    
    # Users - view only
    ('users.view', 'Перегляд користувачів', 'users'),
    
    # Knowledge base - view only
    ('knowledge_base.view', 'Перегляд бази знань', 'knowledge_base'),
]

# Роль: Обробник (Ticket Handler)
HANDLER_PERMISSIONS = [
    # Tickets - process and manage
    ('tickets.view', 'Перегляд тікетів', 'tickets'),
    ('tickets.view_all', 'Перегляд всіх тікетів', 'tickets'),
    ('tickets.edit', 'Редагування тікетів', 'tickets'),
    ('tickets.assign', 'Призначення тікетів', 'tickets'),
    ('tickets.delegate', 'Делегування тікетів', 'tickets'),
    ('tickets.change_status', 'Зміна статусу тікетів', 'tickets'),
    ('tickets.comment', 'Коментування тікетів', 'tickets'),
    ('tickets.view_attachments', 'Перегляд вкладень', 'tickets'),
    ('tickets.upload_attachments', 'Завантаження вкладень', 'tickets'),
    
    # Stations - view only
    ('stations.view', 'Перегляд станцій', 'stations'),
    
    # Operators - view only
    ('operators.view', 'Перегляд операторів', 'operators'),
    
    # Departments - view only
    ('departments.view', 'Перегляд відділів', 'departments'),
    
    # Users - view only
    ('users.view', 'Перегляд користувачів', 'users'),
    
    # Knowledge base - view only
    ('knowledge_base.view', 'Перегляд бази знань', 'knowledge_base'),
]


async def create_permissions(session, permissions_list):
    """Create permissions if they don't exist."""
    created = []
    for code, name, category in permissions_list:
        result = await session.execute(
            select(Permission).where(Permission.code == code)
        )
        perm = result.scalar_one_or_none()
        
        if not perm:
            perm = Permission(
                code=code,
                name=name,
                category=category,
                description=name
            )
            session.add(perm)
            created.append(code)
    
    if created:
        await session.flush()
        print(f"  ➕ Створено {len(created)} нових дозволів")
    
    return created


async def create_role(session, role_name, role_description, permissions_list):
    """Create or update role with permissions."""
    # Check if role exists
    result = await session.execute(
        select(Role).where(Role.name == role_name)
    )
    role = result.scalar_one_or_none()
    
    if role:
        print(f"\n⚠️  Роль '{role_name}' вже існує, оновлюємо...")
        # Clear existing permissions
        await session.execute(
            delete(RolePermission).where(RolePermission.role_id == role.id)
        )
    else:
        # Create new role
        role = Role(
            name=role_name,
            description=role_description,
            is_system=True
        )
        session.add(role)
        await session.flush()
        print(f"\n✅ Створено роль: {role_name}")
    
    # Get all permissions for this role
    permission_codes = [code for code, _, _ in permissions_list]
    result = await session.execute(
        select(Permission).where(Permission.code.in_(permission_codes))
    )
    permissions = result.scalars().all()
    
    # Assign permissions to role
    for perm in permissions:
        role_perm = RolePermission(role_id=role.id, permission_id=perm.id)
        session.add(role_perm)
    
    await session.flush()
    
    print(f"   Опис: {role_description}")
    print(f"   Дозволів: {len(permissions)}")
    
    return role


async def main():
    async with async_session_maker() as session:
        print("="*70)
        print("НАЛАШТУВАННЯ РОЛЕЙ СИСТЕМИ")
        print("="*70)
        
        # Collect all unique permissions
        all_permissions = set()
        all_permissions.update(ADMIN_PERMISSIONS)
        all_permissions.update(SENDER_PERMISSIONS)
        all_permissions.update(HANDLER_PERMISSIONS)
        
        # Create all permissions
        print("\n📋 Створення дозволів...")
        await create_permissions(session, list(all_permissions))
        
        # Create roles
        print("\n👥 Створення ролей...")
        
        # 1. Адмін
        await create_role(
            session,
            'admin',
            'Адміністратор - повний доступ до системи',
            ADMIN_PERMISSIONS
        )
        
        # 2. Відправник
        await create_role(
            session,
            'sender',
            'Відправник - створення та перегляд власних тікетів',
            SENDER_PERMISSIONS
        )
        
        # 3. Обробник
        await create_role(
            session,
            'handler',
            'Обробник - обробка та управління тікетами',
            HANDLER_PERMISSIONS
        )
        
        await session.commit()
        
        print("\n" + "="*70)
        print("✅ НАЛАШТУВАННЯ ЗАВЕРШЕНО")
        print("="*70)
        print("\nСтворено ролі:")
        print("  1. admin     - Адміністратор (повний доступ)")
        print("  2. sender    - Відправник (створення тікетів)")
        print("  3. handler   - Обробник (обробка тікетів)")
        print("="*70)


if __name__ == "__main__":
    asyncio.run(main())
