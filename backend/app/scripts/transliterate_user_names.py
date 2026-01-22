"""Transliterate Ukrainian user names to English."""
import asyncio
from sqlalchemy import select
from app.database import async_session_maker
from app.models.user import User


# Ukrainian to Latin transliteration map (National 2010 standard)
TRANSLIT_MAP = {
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'H', 'Ґ': 'G', 'Д': 'D', 'Е': 'E', 'Є': 'Ye',
    'Ж': 'Zh', 'З': 'Z', 'И': 'Y', 'І': 'I', 'Ї': 'Yi', 'Й': 'Y', 'К': 'K', 'Л': 'L',
    'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
    'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ь': '', 'Ю': 'Yu',
    'Я': 'Ya',
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ie',
    'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'i', 'й': 'i', 'к': 'k', 'л': 'l',
    'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ь': '', 'ю': 'iu',
    'я': 'ia',
    "'": ''
}


def transliterate(text: str) -> str:
    """Transliterate Ukrainian text to Latin."""
    result = []
    for char in text:
        result.append(TRANSLIT_MAP.get(char, char))
    return ''.join(result)


async def main():
    async with async_session_maker() as session:
        # Get all users
        result = await session.execute(select(User))
        users = result.scalars().all()
        
        updated_count = 0
        for user in users:
            # Transliterate names
            user.first_name_en = transliterate(user.first_name)
            user.last_name_en = transliterate(user.last_name)
            updated_count += 1
            print(f"Transliterated: {user.first_name} {user.last_name} -> {user.first_name_en} {user.last_name_en}")
        
        await session.commit()
        print(f"\nTransliterated {updated_count} users")


if __name__ == "__main__":
    asyncio.run(main())
