"""
Script to redistribute users across departments and fix language settings.
"""
import asyncio
import logging

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_maker
from app.models.department import Department
from app.models.user import User, UserNotificationSettings

logger = logging.getLogger(__name__)


async def redistribute_users(db: AsyncSession):
    """Redistribute users across departments and set language to 'en'."""
    logger.info("Redistributing users across departments...")
    
    # Get all departments
    dept_result = await db.execute(select(Department))
    departments = {dept.name: dept for dept in dept_result.scalars().all()}
    
    if not departments:
        logger.error("No departments found!")
        return
    
    logger.info(f"Found {len(departments)} departments")
    
    # Get all users except admin and ticket handler
    users_result = await db.execute(
        select(User).where(
            User.email.notin_(['admin@skai.ua', 'tickets@gmail.com'])
        ).order_by(User.id)
    )
    users = list(users_result.scalars().all())
    
    logger.info(f"Found {len(users)} users to redistribute")
    
    # Department distribution plan (excluding Technical Support which has Ticket Handler)
    dept_names = [
        "Дослідження та розробка",  # Research & Development
        "Біллінг",  # Billing
        "Кадри",  # Human Resources
        "Продажі",  # Sales
        "Маркетинг",  # Marketing
        "Операційний відділ",  # Operations
    ]
    
    # Distribute users evenly across departments
    users_per_dept = len(users) // len(dept_names)
    extra_users = len(users) % len(dept_names)
    
    user_index = 0
    for dept_idx, dept_name in enumerate(dept_names):
        dept = departments.get(dept_name)
        if not dept:
            logger.warning(f"Department '{dept_name}' not found, skipping")
            continue
        
        # Calculate how many users for this department
        count = users_per_dept + (1 if dept_idx < extra_users else 0)
        
        # Assign users to this department
        for _ in range(count):
            if user_index >= len(users):
                break
            
            user = users[user_index]
            user.department_id = dept.id
            user.language = 'en'  # Set language to English
            
            logger.info(f"Assigned {user.email} to {dept_name}")
            user_index += 1
    
    # Update all user notification settings to use 'en' language
    await db.execute(
        update(UserNotificationSettings).values(language='en')
    )
    
    await db.flush()
    logger.info(f"Redistributed {user_index} users across {len(dept_names)} departments")
    logger.info("Set all users language to 'en'")


async def main():
    """Main function to run the redistribution."""
    logger.info("Starting user redistribution...")
    
    async with async_session_maker() as db:
        try:
            await redistribute_users(db)
            await db.commit()
            logger.info("User redistribution completed successfully!")
        except Exception as e:
            await db.rollback()
            logger.error(f"User redistribution failed: {e}")
            raise


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
