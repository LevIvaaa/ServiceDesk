from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Integration(Base):
    __tablename__ = "integrations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Status
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    is_installed: Mapped[bool] = mapped_column(Boolean, default=False)

    # Configuration (encrypted)
    config: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # Module metadata
    version: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    author: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Event hooks
    hooks: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    logs: Mapped[list["IntegrationLog"]] = relationship(
        "IntegrationLog", back_populates="integration", cascade="all, delete-orphan"
    )


class IntegrationLog(Base):
    __tablename__ = "integration_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    integration_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("integrations.id", ondelete="CASCADE"), nullable=False
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)  # sync, webhook, error
    direction: Mapped[str] = mapped_column(String(20), nullable=False)  # inbound, outbound
    payload: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    response: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False)  # success, error, pending
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    # Relationships
    integration: Mapped["Integration"] = relationship("Integration", back_populates="logs")
