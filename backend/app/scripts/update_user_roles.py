"""Update existing users with new roles."""
import asyncio
from sqlalchemy import select, delete
from app.database import async_session_maker
from app.models.user import User, UserRole
from app.models.role import Role


async def main():
    async with async_session_maker() as session:
        print("="*70)
        print("ОНОВЛЕННЯ РОЛЕЙ КОРИСТУВАЧІВ")
        print("="*70)
        
        # Get roles
        result = await session.execute(select(Role))
        roles = {r.name: r for r in result.scalars().all()}
        
        if 'admin' not in roles or 'handler' not in roles:
            print("❌ Ролі не знайдено! Спочатку запустіть setup_roles.py")
            return
        
        # Update admin user
        result = await session.execute(
            select(User).where(User.email == 'admin@ecofactor.ua')
        )
        admin_user = result.scalar_one_or_none()
        
        if admin_user:
            # Clear old roles
            await session.execute(
                delete(UserRole).where(UserRole.user_id == admin_user.id)
            )
            # Assign admin role
            user_role = UserRole(user_id=admin_user.id, role_id=roles['admin'].id)
            session.add(user_role)
            print(f"✅ Оновлено: {admin_user.email} -> admin")
        
        # Update handler user
        result = await session.execute(
            select(User).where(User.email == 'handler@ecofactor.ua')
        )
        handler_user = result.scalar_one_or_none()
        
        if handler_user:
            # Clear old roles
            await session.execute(
                delete(UserRole).where(UserRole.user_id == handler_user.id)
            )
            # Assign handler role
            user_role = UserRole(user_id=handler_user.id, role_id=roles['handler'].id)
            session.add(user_role)
            print(f"✅ Оновлено: {handler_user.email} -> handler")
        
        # Update all other users to sender role
        result = await session.execute(
            select(User).where(
                User.email.notin_(['admin@ecofactor.ua', 'handler@ecofactor.ua']),
                User.is_admin == False
            )
        )
        other_users = result.scalars().all()
        
        for user in other_users:
            # Clear old roles
            await session.execute(
                delete(UserRole).where(UserRole.user_id == user.id)
            )
            # Assign sender role
            user_role = UserRole(user_id=user.id, role_id=roles['sender'].id)
            session.add(user_role)
        
        if other_users:
            print(f"✅ Оновлено {len(other_users)} користувачів -> sender")
        
        await session.commit()
        
        print("\n" + "="*70)
        print("✅ ОНОВЛЕННЯ ЗАВЕРШЕНО")
        print("="*70)


if __name__ == "__main__":
    asyncio.run(main())
