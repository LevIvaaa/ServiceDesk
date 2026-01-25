"""Test script to check notifications in database."""
import asyncio
from sqlalchemy import select, func
from app.database import async_session_maker
from app.models.notification import Notification
from app.models.user import User, UserNotificationSettings


async def check_notifications():
    """Check notifications in database."""
    async with async_session_maker() as db:
        # Count notifications
        result = await db.execute(select(func.count()).select_from(Notification))
        count = result.scalar()
        print(f"Total notifications: {count}")
        
        # Get all notifications
        result = await db.execute(
            select(Notification)
            .order_by(Notification.created_at.desc())
            .limit(10)
        )
        notifications = result.scalars().all()
        
        print("\nRecent notifications:")
        for notif in notifications:
            print(f"  - ID: {notif.id}, User: {notif.user_id}, Type: {notif.type}, Title: {notif.title}")
        
        # Check admin user notification settings
        result = await db.execute(
            select(User).where(User.email == "admin@skai.ua")
        )
        admin = result.scalar_one_or_none()
        
        if admin:
            print(f"\nAdmin user ID: {admin.id}")
            
            result = await db.execute(
                select(UserNotificationSettings).where(UserNotificationSettings.user_id == admin.id)
            )
            settings = result.scalar_one_or_none()
            
            if settings:
                print(f"Admin notification settings:")
                print(f"  - Email enabled: {settings.email_enabled}")
                print(f"  - Status changed notifications: {settings.notify_ticket_status_changed}")
            else:
                print("Admin has no notification settings!")


if __name__ == "__main__":
    asyncio.run(check_notifications())
