"""Add delete and change_status permissions to sender role."""
import asyncio
from sqlalchemy import select
from app.database import async_session_maker
from app.models.role import Role, Permission, RolePermission


async def main():
    async with async_session_maker() as session:
        print("="*70)
        print("ОНОВЛЕННЯ ПРАВ ДЛЯ ВІДПРАВНИКІВ")
        print("="*70)
        
        # Find sender role
        result = await session.execute(
            select(Role).where(Role.name == 'sender')
        )
        sender_role = result.scalar_one_or_none()
        
        if not sender_role:
            print("\n❌ Роль 'sender' не знайдено!")
            return
        
        print(f"\n✅ Знайдено роль: {sender_role.name} (ID: {sender_role.id})")
        
        # Permissions to add
        permissions_to_add = [
            'tickets.delete',
            'tickets.change_status',
        ]
        
        added_count = 0
        
        for perm_code in permissions_to_add:
            # Find permission
            result = await session.execute(
                select(Permission).where(Permission.code == perm_code)
            )
            perm = result.scalar_one_or_none()
            
            if not perm:
                print(f"\n⚠️  Дозвіл '{perm_code}' не знайдено, пропускаємо...")
                continue
            
            # Check if permission already assigned
            result = await session.execute(
                select(RolePermission).where(
                    RolePermission.role_id == sender_role.id,
                    RolePermission.permission_id == perm.id
                )
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                print(f"⚠️  Дозвіл '{perm_code}' вже призначено")
            else:
                print(f"➕ Додавання дозволу '{perm_code}'...")
                role_perm = RolePermission(
                    role_id=sender_role.id,
                    permission_id=perm.id
                )
                session.add(role_perm)
                added_count += 1
        
        if added_count > 0:
            await session.flush()
            print(f"\n✅ Додано {added_count} нових дозволів!")
        
        await session.commit()
        
        # Count users with sender role
        from app.models.user import User, UserRole
        result = await session.execute(
            select(User)
            .join(UserRole)
            .where(UserRole.role_id == sender_role.id)
        )
        senders = result.scalars().all()
        
        print("\n" + "="*70)
        print("✅ ОНОВЛЕННЯ ЗАВЕРШЕНО")
        print("="*70)
        print(f"\nКористувачів з роллю 'sender': {len(senders)}")
        if senders:
            print("\nСписок відправників:")
            for user in senders:
                print(f"  - {user.first_name} {user.last_name} ({user.email})")
        print("\nВідправники тепер можуть:")
        print("  - Видаляти свої тікети (зі статусом 'new' або 'closed')")
        print("  - Закривати свої тікети (змінювати статус на 'closed')")
        print("="*70)


if __name__ == "__main__":
    asyncio.run(main())
