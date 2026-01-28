"""Script to transliterate user names to English."""
import asyncio
import logging
from sqlalchemy import select
from app.database import async_session_maker
from app.models.user import User
from app.utils.transliteration import transliterate

logger = logging.getLogger(__name__)

async def main():
    async with async_session_maker() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()
        
        for user in users:
            user.first_name_en = transliterate(user.first_name)
            user.last_name_en = transliterate(user.last_name)
            logger.info(f"{user.first_name} {user.last_name} -> {user.first_name_en} {user.last_name_en}")
        
        await db.commit()
        logger.info(f"Transliterated {len(users)} users")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
