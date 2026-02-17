from typing import Annotated, Optional
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession, PermissionRequired
from app.models.knowledge_base import KnowledgeArticle, KnowledgeArticleVersion
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.knowledge_base import (
    KnowledgeArticleCreate,
    KnowledgeArticleListResponse,
    KnowledgeArticleResponse,
    KnowledgeArticleUpdate,
    KnowledgeSearchRequest,
    KnowledgeSearchResponse,
    KnowledgeSearchResult,
)

router = APIRouter()
logger = logging.getLogger(__name__)


def serialize_article(article: KnowledgeArticle) -> dict:
    """Serialize KnowledgeArticle to plain dict to avoid lazy-load issues."""
    return {
        "id": article.id,
        "title": article.title,
        "content": article.content,
        "category": article.category,
        "language": article.language,
        "tags": article.tags,
        "station_models": article.station_models,
        "error_codes": article.error_codes,
        "author_id": article.author_id,
        "author": article.author,
        "is_published": article.is_published,
        "view_count": article.view_count,
        "helpful_count": article.helpful_count,
        "created_at": article.created_at,
        "updated_at": article.updated_at,
    }


@router.get("", response_model=PaginatedResponse[KnowledgeArticleListResponse])
async def list_articles(
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("knowledge.view"))],
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    category: Optional[str] = None,
    tag: Optional[str] = None,
    language: Optional[str] = Query(None, pattern="^(ua|en)$"),
    is_published: Optional[bool] = None,
):
    """List knowledge base articles with pagination and filters."""
    query = select(KnowledgeArticle).options(selectinload(KnowledgeArticle.author))

    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (KnowledgeArticle.title.ilike(search_filter))
            | (KnowledgeArticle.content.ilike(search_filter))
        )
    if category:
        query = query.where(KnowledgeArticle.category == category)
    if tag:
        query = query.where(KnowledgeArticle.tags.contains([tag]))
    if language:
        query = query.where(KnowledgeArticle.language == language)
    if is_published is not None:
        query = query.where(KnowledgeArticle.is_published == is_published)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    # Apply pagination
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page).order_by(KnowledgeArticle.updated_at.desc())

    result = await db.execute(query)
    articles = result.scalars().all()

    return PaginatedResponse(
        items=[KnowledgeArticleListResponse.model_validate(a) for a in articles],
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page,
    )


@router.post("", response_model=KnowledgeArticleResponse, status_code=status.HTTP_201_CREATED)
async def create_article(
    article_data: KnowledgeArticleCreate,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("knowledge.create"))],
):
    """Create a new knowledge base article."""
    article = KnowledgeArticle(
        author_id=current_user.id,
        **article_data.model_dump(),
    )
    db.add(article)
    await db.flush()

    # Create initial version
    version = KnowledgeArticleVersion(
        article_id=article.id,
        version=1,
        title=article.title,
        content=article.content,
        editor_id=current_user.id,
    )
    db.add(version)

    await db.commit()
    await db.refresh(article)

    return serialize_article(article)


@router.get("/{article_id}", response_model=KnowledgeArticleResponse)
async def get_article(
    article_id: int,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("knowledge.view"))],
):
    """Get a specific article by ID."""
    result = await db.execute(
        select(KnowledgeArticle)
        .options(selectinload(KnowledgeArticle.author))
        .where(KnowledgeArticle.id == article_id)
    )
    article = result.scalar_one_or_none()

    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found",
        )

    # Increment view count
    article.view_count += 1
    await db.commit()
    await db.refresh(article)

    return serialize_article(article)


@router.put("/{article_id}", response_model=KnowledgeArticleResponse)
async def update_article(
    article_id: int,
    article_data: KnowledgeArticleUpdate,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("knowledge.edit"))],
):
    """Update an article."""
    result = await db.execute(
        select(KnowledgeArticle)
        .options(selectinload(KnowledgeArticle.author))
        .where(KnowledgeArticle.id == article_id)
    )
    article = result.scalar_one_or_none()

    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found",
        )

    # Check if content changed
    content_changed = article_data.content and article_data.content != article.content

    # Update fields
    update_data = article_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(article, field, value)

    # Create new version if content changed
    if content_changed:
        # Get latest version number
        version_result = await db.execute(
            select(func.max(KnowledgeArticleVersion.version))
            .where(KnowledgeArticleVersion.article_id == article_id)
        )
        latest_version = version_result.scalar() or 0

        version = KnowledgeArticleVersion(
            article_id=article.id,
            version=latest_version + 1,
            title=article.title,
            content=article.content,
            editor_id=current_user.id,
        )
        db.add(version)

    await db.commit()
    await db.refresh(article)

    return serialize_article(article)


@router.delete("/{article_id}")
async def delete_article(
    article_id: int,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("knowledge.delete"))],
):
    """Delete an article."""
    result = await db.execute(
        select(KnowledgeArticle).where(KnowledgeArticle.id == article_id)
    )
    article = result.scalar_one_or_none()

    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found",
        )

    await db.delete(article)
    await db.commit()

    return {"message": "Article deleted successfully"}


@router.post("/{article_id}/publish", response_model=KnowledgeArticleResponse)
async def publish_article(
    article_id: int,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("knowledge.publish"))],
):
    """Publish an article."""
    result = await db.execute(
        select(KnowledgeArticle)
        .options(selectinload(KnowledgeArticle.author))
        .where(KnowledgeArticle.id == article_id)
    )
    article = result.scalar_one_or_none()

    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found",
        )

    article.is_published = True
    await db.commit()

    return serialize_article(article)


@router.post("/{article_id}/helpful")
async def mark_helpful(
    article_id: int,
    db: DbSession,
    current_user: CurrentUser,
):
    """Mark an article as helpful."""
    result = await db.execute(
        select(KnowledgeArticle).where(KnowledgeArticle.id == article_id)
    )
    article = result.scalar_one_or_none()

    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found",
        )

    article.helpful_count += 1
    await db.commit()

    return {"message": "Marked as helpful", "helpful_count": article.helpful_count}


@router.post("/search", response_model=KnowledgeSearchResponse)
async def search_knowledge_base(
    search_data: KnowledgeSearchRequest,
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("knowledge.view"))],
):
    """Search knowledge base using text search."""
    # Simple text search
    query = (
        select(KnowledgeArticle)
        .where(
            KnowledgeArticle.is_published == True,
        )
    )
    
    # Add search filter
    search_filter = f"%{search_data.query}%"
    query = query.where(
        (KnowledgeArticle.title.ilike(search_filter))
        | (KnowledgeArticle.content.ilike(search_filter))
    )

    if search_data.language:
        query = query.where(KnowledgeArticle.language == search_data.language)
    if search_data.category:
        query = query.where(KnowledgeArticle.category == search_data.category)
    
    query = query.limit(search_data.limit)

    result = await db.execute(query)
    articles = result.scalars().all()

    return KnowledgeSearchResponse(
        results=[
            KnowledgeSearchResult(
                article_id=a.id,
                title=a.title,
                category=a.category,
                content_preview=a.content[:500],
                score=1.0,
            )
            for a in articles
        ],
        query=search_data.query,
    )


@router.post("/reindex")
async def reindex_knowledge_base(
    db: DbSession,
    current_user: Annotated[User, Depends(PermissionRequired("knowledge.edit"))],
):
    """Reindex all articles - not implemented without RAG."""
    return {"message": "Reindexing not available without RAG service"}
