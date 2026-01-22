import hashlib
import logging
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


class RAGService:
    """Service for RAG (Retrieval Augmented Generation) using Qdrant and OpenAI."""

    COLLECTION_NAME = "knowledge_base"
    EMBEDDING_MODEL = "text-embedding-3-small"
    EMBEDDING_DIMENSION = 1536

    def __init__(self):
        self._qdrant = None
        self._openai = None

    @property
    def qdrant(self):
        if self._qdrant is None:
            from qdrant_client import QdrantClient
            self._qdrant = QdrantClient(
                host=settings.QDRANT_HOST,
                port=settings.QDRANT_PORT,
            )
            self._ensure_collection()
        return self._qdrant

    @property
    def openai(self):
        if self._openai is None:
            from openai import AsyncOpenAI
            self._openai = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        return self._openai

    def _ensure_collection(self):
        """Create collection if it doesn't exist."""
        from qdrant_client.models import Distance, VectorParams

        collections = self.qdrant.get_collections().collections
        if not any(c.name == self.COLLECTION_NAME for c in collections):
            self.qdrant.create_collection(
                collection_name=self.COLLECTION_NAME,
                vectors_config=VectorParams(
                    size=self.EMBEDDING_DIMENSION,
                    distance=Distance.COSINE,
                ),
            )
            logger.info(f"Created Qdrant collection: {self.COLLECTION_NAME}")

    async def get_embedding(self, text: str) -> list[float]:
        """Get embedding for text using OpenAI."""
        response = await self.openai.embeddings.create(
            model=self.EMBEDDING_MODEL,
            input=text,
        )
        return response.data[0].embedding

    async def index_article(self, article) -> str:
        """Index an article in Qdrant."""
        from qdrant_client.models import PointStruct

        # Build full text for indexing
        full_text = f"{article.title}\n\n{article.content}"
        if article.tags:
            full_text += f"\n\nТеги: {', '.join(article.tags)}"

        # Get embedding
        embedding = await self.get_embedding(full_text)

        # Generate UUID for Qdrant
        qdrant_id = hashlib.md5(f"article_{article.id}_{article.language}".encode()).hexdigest()

        # Upsert to Qdrant
        self.qdrant.upsert(
            collection_name=self.COLLECTION_NAME,
            points=[
                PointStruct(
                    id=qdrant_id,
                    vector=embedding,
                    payload={
                        "article_id": article.id,
                        "title": article.title,
                        "category": article.category,
                        "language": article.language,
                        "tags": article.tags or [],
                        "content_preview": article.content[:500],
                    },
                )
            ],
        )

        logger.info(f"Indexed article {article.id} ({article.language}) in Qdrant")
        return qdrant_id

    async def search(
        self,
        query: str,
        limit: int = 5,
        category: Optional[str] = None,
        tags: Optional[list[str]] = None,
        language: Optional[str] = None,
    ) -> list[dict]:
        """Search knowledge base using vector similarity."""
        from qdrant_client.models import Filter, FieldCondition, MatchValue, MatchAny

        query_embedding = await self.get_embedding(query)

        # Build filters
        query_filter = None
        must = []
        
        if language:
            must.append(
                FieldCondition(key="language", match=MatchValue(value=language))
            )
        if category:
            must.append(
                FieldCondition(key="category", match=MatchValue(value=category))
            )
        if tags:
            must.append(
                FieldCondition(key="tags", match=MatchAny(any=tags))
            )
        
        if must:
            query_filter = Filter(must=must)

        results = self.qdrant.search(
            collection_name=self.COLLECTION_NAME,
            query_vector=query_embedding,
            limit=limit,
            query_filter=query_filter,
        )

        return [
            {
                "article_id": hit.payload["article_id"],
                "title": hit.payload["title"],
                "category": hit.payload["category"],
                "content_preview": hit.payload["content_preview"],
                "score": hit.score,
            }
            for hit in results
        ]

    async def delete_article(self, article_id: int, language: str = "uk"):
        """Remove article from Qdrant."""
        qdrant_id = hashlib.md5(f"article_{article_id}_{language}".encode()).hexdigest()
        self.qdrant.delete(
            collection_name=self.COLLECTION_NAME,
            points_selector=[qdrant_id],
        )
        logger.info(f"Deleted article {article_id} ({language}) from Qdrant")
