import asyncio
from sqlalchemy import select, func
from app.database import async_session_maker
from app.models.knowledge_base import KnowledgeArticle

async def count_articles():
    async with async_session_maker() as db:
        result = await db.execute(select(func.count()).select_from(KnowledgeArticle))
        count = result.scalar()
        print(f"Всього статей в базі знань: {count}")
        
        # Show some titles
        articles = await db.execute(select(KnowledgeArticle.title).limit(10))
        print("\nПерші 10 статей:")
        for i, (title,) in enumerate(articles, 1):
            print(f"{i}. {title}")

asyncio.run(count_articles())
