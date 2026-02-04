"""Create test sender user for testing."""
import asyncio
from sqlalchemy import select
from app.database import async_session_maker
from app.models.user import User, UserRole
from app.models.role import Role
from app.models.department import Department
from app.core.security import get_password_hash


async def main():
    async with async_session_maker() as session:
        # Get sender role
        result = await session.execute(
            select(Role).where(Role.name == 'sender')
        )
        sender_role = result.scalar_one_or_none()
        
        if not sender_role:
            print("❌ Роль 'sender' не знайдено!")
            return
        
        # Get first department
        result = await session.execute(select(Department).limit(1))
        department = result.scalar_one_or_none()
        
        if not department:
            print("❌ Відділ не знайдено!")
            return
        
        # Check if user exists
        email = "sender@ecofactor.ua"
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
            password_hash=get_password_hash("sender123"),
            first_name="Відправник",
            last_name="Тікетів",
            first_name_en="Sender",
            last_name_en="Tickets",
            department_id=department.id,
            is_active=True,
            is_admin=False
        )
        session.add(user)
        await session.flush()
        
        # Assign sender role
        user_role = UserRole(user_id=user.id, role_id=sender_role.id)
        session.add(user_role)
        
        await session.commit()
        
        print("="*70)
        print("✅ СТВОРЕНО ТЕСТОВОГО ВІДПРАВНИКА")
        print("="*70)
        print(f"Email: {email}")
        print(f"Пароль: sender123")
        print(f"Роль: sender (Відправник)")
        print(f"Відділ: {department.name}")
        print("="*70)
        print("\nЦей користувач може:")
        print("  • Створювати тікети")
        print("  • Переглядати свої тікети")
        print("  • Коментувати тікети")
        print("  • Завантажувати вкладення")
        print("  • Переглядати станції, операторів, відділи (тільки перегляд)")
        print("\nЦей користувач НЕ може:")
        print("  ✗ Створювати/редагувати станції")
        print("  ✗ Створювати/редагувати операторів")
        print("  ✗ Створювати/редагувати відділи")
        print("  ✗ Створювати/редагувати користувачів")
        print("="*70)


if __name__ == "__main__":
    asyncio.run(main())
