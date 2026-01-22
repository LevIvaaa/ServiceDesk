import asyncio
import logging

from sqlalchemy import select

from app.database import async_session_maker
from app.models.knowledge_base import KnowledgeArticle
from app.services.rag_service import RAGService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def reindex_all_articles():
    """Reindex all published articles in Qdrant."""
    logger.info("Starting reindexing of all knowledge base articles...")

    rag_service = RAGService()

    async with async_session_maker() as db:
        try:
            # Get all published articles
            result = await db.execute(
                select(KnowledgeArticle).where(KnowledgeArticle.is_published == True)
            )
            articles = result.scalars().all()

            logger.info(f"Found {len(articles)} published articles to index")

            indexed = 0
            for article in articles:
                try:
                    qdrant_id = await rag_service.index_article(article)
                    article.qdrant_id = qdrant_id
                    indexed += 1
                    logger.info(f"Indexed {indexed}/{len(articles)}: {article.title} ({article.language})")
                except Exception as e:
                    logger.error(f"Failed to index article {article.id}: {e}")

            await db.commit()
            logger.info(f"Successfully reindexed {indexed} articles!")

        except Exception as e:
            await db.rollback()
            logger.error(f"Reindexing failed: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(reindex_all_articles())
