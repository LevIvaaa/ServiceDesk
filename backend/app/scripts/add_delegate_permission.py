"""Add delegate permission to handler role."""
import asyncio
from sqlalchemy import select
from app.database import async_session_maker
from app.models.role import Role, Permission, RolePermission


async def main():
    async with async_session_maker() as session:
        print("="*70)
        print("ДОДАВАННЯ ПРАВА ДЕЛЕГУВАННЯ ДЛЯ ОБРОБНИКІВ")
        print("="*70)
        
        # Find handler role
        result = await session.execute(
            select(Role).where(Role.name == 'handler')
        )
        handler_role = result.scalar_one_or_none()
        
        if not handler_role:
            print("\n❌ Роль 'handler' не знайдено!")
            return
        
        print(f"\n✅ Знайдено роль: {handler_role.name} (ID: {handler_role.id})")
        
        # Find or create delegate permission
        result = await session.execute(
            select(Permission).where(Permission.code == 'tickets.delegate')
        )
        delegate_perm = result.scalar_one_or_none()
        
        if not delegate_perm:
            print("\n📋 Створення дозволу 'tickets.delegate'...")
            delegate_perm = Permission(
                code='tickets.delegate',
                name='Делегування тікетів',
                category='tickets',
                description='Делегування тікетів іншим відділам'
            )
            session.add(delegate_perm)
            await session.flush()
            print(f"   ✅ Створено дозвіл: {delegate_perm.code}")
        else:
            print(f"\n✅ Знайдено дозвіл: {delegate_perm.code} (ID: {delegate_perm.id})")
        
        # Check if permission already assigned
        result = await session.execute(
            select(RolePermission).where(
                RolePermission.role_id == handler_role.id,
                RolePermission.permission_id == delegate_perm.id
            )
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            print("\n⚠️  Дозвіл вже призначено ролі 'handler'")
        else:
            print("\n➕ Додавання дозволу до ролі 'handler'...")
            role_perm = RolePermission(
                role_id=handler_role.id,
                permission_id=delegate_perm.id
            )
            session.add(role_perm)
            await session.flush()
            print("   ✅ Дозвіл успішно додано!")
        
        await session.commit()
        
        # Count users with handler role
        from app.models.user import User, UserRole
        result = await session.execute(
            select(User)
            .join(UserRole)
            .where(UserRole.role_id == handler_role.id)
        )
        handlers = result.scalars().all()
        
        print("\n" + "="*70)
        print("✅ ОНОВЛЕННЯ ЗАВЕРШЕНО")
        print("="*70)
        print(f"\nКористувачів з роллю 'handler': {len(handlers)}")
        if handlers:
            print("\nСписок обробників:")
            for user in handlers:
                print(f"  - {user.first_name} {user.last_name} ({user.email})")
        print("\nВсі обробники тепер мають право делегувати тікети!")
        print("="*70)


if __name__ == "__main__":
    asyncio.run(main())
