"""Create test admin user for testing."""
import asyncio
from sqlalchemy import select
from app.database import async_session_maker
from app.models.user import User, UserRole
from app.models.role import Role
from app.models.department import Department
from app.core.security import get_password_hash


async def main():
    async with async_session_maker() as session:
        # Get admin role
        result = await session.execute(
            select(Role).where(Role.name == 'admin')
        )
        admin_role = result.scalar_one_or_none()
        
        if not admin_role:
            print("❌ Роль 'admin' не знайдено!")
            return
        
        # Get first department
        result = await session.execute(select(Department).limit(1))
        department = result.scalar_one_or_none()
        
        if not department:
            print("❌ Відділ не знайдено!")
            return
        
        # Check if user exists
        email = "manager@ecofactor.ua"
        result = await session.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()
        
        if user:
            print(f"⚠️  Користувач {email} вже існує")
            return
        
        # Create user
        user = User(
            email=email,
            password_hash=get_password_hash("manager123"),
            first_name="Менеджер",
            last_name="Системи",
            first_name_en="Manager",
            last_name_en="System",
            department_id=department.id,
            is_active=True,
            is_admin=False
        )
        session.add(user)
        await session.flush()
        
        # Assign admin role
        user_role = UserRole(user_id=user.id, role_id=admin_role.id)
        session.add(user_role)
        
        await session.commit()
        
        print("="*70)
        print("✅ СТВОРЕНО ТЕСТОВОГО АДМІНІСТРАТОРА")
        print("="*70)
        print(f"Email: {email}")
        print(f"Пароль: manager123")
        print(f"Роль: admin (Адміністратор)")
        print(f"Відділ: {department.name}")
        print("="*70)
        print("\nЦей користувач може:")
        print("  • Створювати та редагувати станції")
        print("  • Створювати та редагувати операторів")
        print("  • Створювати та редагувати відділи")
        print("  • Створювати користувачів та призначати їм ролі")
        print("  • Встановлювати логіни та паролі")
        print("  • Повний доступ до тікетів")
        print("="*70)


if __name__ == "__main__":
    asyncio.run(main())
