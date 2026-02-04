"""Create manager role with permissions to manage stations, operators, departments and users."""
import asyncio
from sqlalchemy import select
from app.database import async_session_maker
from app.models.role import Role, Permission


MANAGER_PERMISSIONS = [
    # Stations management
    'stations.view',
    'stations.create',
    'stations.edit',
    'stations.delete',
    
    # Operators management
    'operators.view',
    'operators.create',
    'operators.edit',
    'operators.delete',
    
    # Departments management
    'departments.view',
    'departments.create',
    'departments.edit',
    'departments.delete',
    
    # Users management
    'users.view',
    'users.create',
    'users.edit',
    'users.delete',
    'users.assign_roles',
    'users.reset_password',
    
    # Tickets - view only
    'tickets.view',
    'tickets.view_all',
    'tickets.view_attachments',
    
    # Knowledge base - view only
    'knowledge_base.view',
]


async def main():
    async with async_session_maker() as session:
        # Check if role exists
        result = await session.execute(
            select(Role).where(Role.name == 'manager')
        )
        role = result.scalar_one_or_none()
        
        if role:
            print("⚠️  Роль 'manager' вже існує")
            # Delete existing role to recreate
            await session.delete(role)
            await session.commit()
            
            # Create new role
            role = Role(
                name='manager',
                display_name='Менеджер',
                description='Управління станціями, операторами, відділами та користувачами'
            )
            session.add(role)
            await session.flush()
            print("✅ Оновлено роль: manager")
        else:
            # Create role
            role = Role(
                name='manager',
                display_name='Менеджер',
                description='Управління станціями, операторами, відділами та користувачами'
            )
            session.add(role)
            await session.flush()
            print("✅ Створено роль: manager")
        
        # Get all permissions
        result = await session.execute(select(Permission))
        all_permissions = {p.name: p for p in result.scalars().all()}
        
        # Create missing permissions
        created_perms = []
        for perm_name in MANAGER_PERMISSIONS:
            if perm_name not in all_permissions:
                perm = Permission(
                    name=perm_name,
                    description=f'Permission: {perm_name}'
                )
                session.add(perm)
                await session.flush()
                all_permissions[perm_name] = perm
                created_perms.append(perm_name)
                print(f"  ➕ Створено дозвіл: {perm_name}")
        
        if created_perms:
            print(f"\n✅ Створено {len(created_perms)} нових дозволів")
        
        # Assign permissions to role
        for perm_name in MANAGER_PERMISSIONS:
            if perm_name in all_permissions:
                perm = all_permissions[perm_name]
                if perm not in role.permissions:
                    role.permissions.append(perm)
        
        await session.commit()
        
        print(f"\n{'='*60}")
        print(f"✅ РОЛЬ 'MANAGER' НАЛАШТОВАНО")
        print(f"{'='*60}")
        print(f"Назва: {role.display_name}")
        print(f"Опис: {role.description}")
        print(f"Кількість дозволів: {len(role.permissions)}")
        print(f"\nДозволи:")
        for perm in sorted(role.permissions, key=lambda p: p.name):
            print(f"  • {perm.name}")
        print(f"{'='*60}")


if __name__ == "__main__":
    asyncio.run(main())
