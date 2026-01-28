"""
Seed script to populate the database with sample users.
"""
import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.database import async_session_maker
from app.models.department import Department
from app.models.role import Role
from app.models.user import User, UserNotificationSettings, UserRole

logger = logging.getLogger(__name__)


async def seed_users(db: AsyncSession):
    """Create 30+ sample users."""
    logger.info("Seeding users...")
    
    # Get department
    dept_result = await db.execute(
        select(Department).where(Department.name == "Технічна підтримка")
    )
    department = dept_result.scalar_one_or_none()
    
    if not department:
        logger.warning("Department not found, creating default department")
        department = Department(
            name="Технічна підтримка",
            description="Відділ технічної підтримки"
        )
        db.add(department)
        await db.flush()
    
    # Get roles
    operator_role = await db.execute(select(Role).where(Role.name == "operator"))
    operator_role = operator_role.scalar_one_or_none()
    
    technician_role = await db.execute(select(Role).where(Role.name == "technician"))
    technician_role = technician_role.scalar_one_or_none()
    
    manager_role = await db.execute(select(Role).where(Role.name == "manager"))
    manager_role = manager_role.scalar_one_or_none()
    
    users_data = [
        ("Олександр", "Коваленко", "o.kovalenko@ecofactor.ua", "+380501234567", operator_role),
        ("Марія", "Шевченко", "m.shevchenko@ecofactor.ua", "+380502345678", operator_role),
        ("Іван", "Бондаренко", "i.bondarenko@ecofactor.ua", "+380503456789", technician_role),
        ("Олена", "Мельник", "o.melnyk@ecofactor.ua", "+380504567890", technician_role),
        ("Андрій", "Ткаченко", "a.tkachenko@ecofactor.ua", "+380505678901", technician_role),
        ("Наталія", "Кравченко", "n.kravchenko@ecofactor.ua", "+380506789012", manager_role),
        ("Дмитро", "Морозов", "d.morozov@ecofactor.ua", "+380507890123", operator_role),
        ("Юлія", "Павленко", "y.pavlenko@ecofactor.ua", "+380508901234", operator_role),
        ("Сергій", "Лисенко", "s.lysenko@ecofactor.ua", "+380509012345", technician_role),
        ("Тетяна", "Савченко", "t.savchenko@ecofactor.ua", "+380501112233", technician_role),
        ("Віктор", "Петренко", "v.petrenko@ecofactor.ua", "+380502223344", operator_role),
        ("Ірина", "Коваль", "i.koval@ecofactor.ua", "+380503334455", operator_role),
        ("Максим", "Гриценко", "m.hrytsenko@ecofactor.ua", "+380504445566", technician_role),
        ("Анна", "Романенко", "a.romanenko@ecofactor.ua", "+380505556677", manager_role),
        ("Олег", "Сидоренко", "o.sydorenko@ecofactor.ua", "+380506667788", operator_role),
        ("Світлана", "Іваненко", "s.ivanenko@ecofactor.ua", "+380507778899", operator_role),
        ("Павло", "Захарченко", "p.zakharchenko@ecofactor.ua", "+380508889900", technician_role),
        ("Катерина", "Литвиненко", "k.lytvynenko@ecofactor.ua", "+380509990011", technician_role),
        ("Роман", "Білоус", "r.bilous@ecofactor.ua", "+380501122334", operator_role),
        ("Вікторія", "Гончаренко", "v.honcharenko@ecofactor.ua", "+380502233445", operator_role),
        ("Артем", "Ковальчук", "a.kovalchuk@ecofactor.ua", "+380503344556", technician_role),
        ("Людмила", "Семенова", "l.semenova@ecofactor.ua", "+380504455667", manager_role),
        ("Валерій", "Поліщук", "v.polishchuk@ecofactor.ua", "+380505566778", operator_role),
        ("Оксана", "Марченко", "o.marchenko@ecofactor.ua", "+380506677889", operator_role),
        ("Ігор", "Руденко", "i.rudenko@ecofactor.ua", "+380507788990", technician_role),
        ("Галина", "Ткач", "h.tkach@ecofactor.ua", "+380508899001", technician_role),
        ("Богдан", "Левченко", "b.levchenko@ecofactor.ua", "+380509900112", operator_role),
        ("Тамара", "Волошина", "t.voloshyna@ecofactor.ua", "+380501010101", operator_role),
        ("Василь", "Кириленко", "v.kyrylenko@ecofactor.ua", "+380502020202", technician_role),
        ("Лариса", "Данилова", "l.danylova@ecofactor.ua", "+380503030303", manager_role),
        ("Микола", "Федоров", "m.fedorov@ecofactor.ua", "+380504040404", operator_role),
        ("Євгенія", "Соколова", "e.sokolova@ecofactor.ua", "+380505050505", operator_role),
        ("Станіслав", "Макаренко", "s.makarenko@ecofactor.ua", "+380506060606", technician_role),
        ("Алла", "Новікова", "a.novikova@ecofactor.ua", "+380507070707", technician_role),
    ]
    
    users_created = 0
    default_password = get_password_hash("password123")  # Default password for all users
    
    for first_name, last_name, email, phone, role in users_data:
        # Check if user already exists
        existing = await db.execute(
            select(User).where(User.email == email)
        )
        if existing.scalar_one_or_none():
            logger.info(f"User {email} already exists, skipping")
            continue
        
        user = User(
            email=email,
            password_hash=default_password,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            department_id=department.id,
            is_active=True,
            is_admin=False,
        )
        db.add(user)
        await db.flush()
        
        # Add role
        if role:
            user_role = UserRole(user_id=user.id, role_id=role.id)
            db.add(user_role)
        
        # Create notification settings
        settings = UserNotificationSettings(user_id=user.id)
        db.add(settings)
        
        users_created += 1
        logger.info(f"Created user: {email} - {first_name} {last_name}")
    
    await db.flush()
    logger.info(f"Created {users_created} users (password: password123)")


async def main():
    """Main function to run the seeding."""
    logger.info("Starting users seeding...")
    
    async with async_session_maker() as db:
        try:
            await seed_users(db)
            await db.commit()
            logger.info("Users seeding completed successfully!")
        except Exception as e:
            await db.rollback()
            logger.error(f"Users seeding failed: {e}")
            raise


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
