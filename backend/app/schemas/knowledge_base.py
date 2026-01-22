from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class KnowledgeArticleBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    content: str = Field(..., min_length=1)
    category: str = Field(..., pattern="^(troubleshooting|how-to|faq|technical)$")
    language: str = Field(default="uk", pattern="^(uk|en)$")
    tags: Optional[list[str]] = None
    station_models: Optional[list[str]] = None
    error_codes: Optional[list[str]] = None


class KnowledgeArticleCreate(KnowledgeArticleBase):
    is_published: bool = False


class KnowledgeArticleUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    content: Optional[str] = Field(None, min_length=1)
    category: Optional[str] = Field(None, pattern="^(troubleshooting|how-to|faq|technical)$")
    language: Optional[str] = Field(None, pattern="^(uk|en)$")
    tags: Optional[list[str]] = None
    station_models: Optional[list[str]] = None
    error_codes: Optional[list[str]] = None
    is_published: Optional[bool] = None


class AuthorShort(BaseModel):
    id: int
    first_name: str
    last_name: str

    class Config:
        from_attributes = True


class KnowledgeArticleResponse(BaseModel):
    id: int
    title: str
    content: str
    category: str
    language: str
    tags: Optional[list[str]]
    station_models: Optional[list[str]]
    error_codes: Optional[list[str]]
    author_id: int
    author: AuthorShort
    is_published: bool
    view_count: int
    helpful_count: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class KnowledgeArticleListResponse(BaseModel):
    id: int
    title: str
    category: str
    language: str
    tags: Optional[list[str]]
    author: AuthorShort
    is_published: bool
    view_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class KnowledgeSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    category: Optional[str] = None
    tags: Optional[list[str]] = None
    language: Optional[str] = Field(None, pattern="^(uk|en)$")
    limit: int = Field(default=50, ge=1, le=100)


class KnowledgeSearchResult(BaseModel):
    article_id: int
    title: str
    category: str
    content_preview: str
    score: float


class KnowledgeSearchResponse(BaseModel):
    results: list[KnowledgeSearchResult]
    query: str
