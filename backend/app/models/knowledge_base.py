from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class KnowledgeArticle(Base):
    __tablename__ = "knowledge_articles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)  # Markdown
    content_html: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    language: Mapped[str] = mapped_column(String(5), nullable=False, default="uk", index=True)
    tags: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String(50)), nullable=True)

    # Relations to station models and error codes
    error_codes: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String(50)), nullable=True)
    station_models: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String(100)), nullable=True)

    # Metadata
    author_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    last_editor_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    helpful_count: Mapped[int] = mapped_column(Integer, default=0)
    not_helpful_count: Mapped[int] = mapped_column(Integer, default=0)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Qdrant vector ID
    qdrant_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Relationships
    author: Mapped["User"] = relationship("User", foreign_keys=[author_id])
    last_editor: Mapped[Optional["User"]] = relationship("User", foreign_keys=[last_editor_id])
    versions: Mapped[list["KnowledgeArticleVersion"]] = relationship(
        "KnowledgeArticleVersion", back_populates="article", cascade="all, delete-orphan"
    )


class KnowledgeArticleVersion(Base):
    __tablename__ = "knowledge_article_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    article_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("knowledge_articles.id", ondelete="CASCADE"), nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    editor_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    change_summary: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    article: Mapped["KnowledgeArticle"] = relationship("KnowledgeArticle", back_populates="versions")
    editor: Mapped["User"] = relationship("User")
