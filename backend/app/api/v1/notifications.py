from datetime import datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.models.notification import Notification
from app.models.user import User
from app.schemas.common import PaginatedResponse

router = APIRouter()


class NotificationResponse(BaseModel):
    id: int
    type: str
    title: str
    message: str
    ticket_id: Optional[int]
    is_read: bool
    read_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationCountResponse(BaseModel):
    total: int
    unread: int


@router.get("", response_model=PaginatedResponse[NotificationResponse])
async def list_notifications(
    db: DbSession,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
):
    """Get notifications for current user."""
    query = select(Notification).where(Notification.user_id == current_user.id)

    if unread_only:
        query = query.where(Notification.is_read == False)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Get paginated results
    query = query.order_by(Notification.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(query)
    notifications = result.scalars().all()

    return PaginatedResponse(
        items=notifications,
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page,
    )


@router.get("/count", response_model=NotificationCountResponse)
async def get_notification_count(
    db: DbSession,
    current_user: CurrentUser,
):
    """Get notification counts for current user."""
    # Total count
    total_result = await db.execute(
        select(func.count())
        .where(Notification.user_id == current_user.id)
    )
    total = total_result.scalar()

    # Unread count
    unread_result = await db.execute(
        select(func.count())
        .where(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
    )
    unread = unread_result.scalar()

    return NotificationCountResponse(total=total, unread=unread)


@router.put("/{notification_id}/read")
async def mark_as_read(
    notification_id: int,
    db: DbSession,
    current_user: CurrentUser,
):
    """Mark notification as read."""
    result = await db.execute(
        select(Notification)
        .where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id
        )
    )
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    notification.is_read = True
    notification.read_at = datetime.utcnow()
    await db.commit()

    return {"message": "Notification marked as read"}


@router.put("/read-all")
async def mark_all_as_read(
    db: DbSession,
    current_user: CurrentUser,
):
    """Mark all notifications as read."""
    await db.execute(
        update(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
        .values(is_read=True, read_at=datetime.utcnow())
    )
    await db.commit()

    return {"message": "All notifications marked as read"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    db: DbSession,
    current_user: CurrentUser,
):
    """Delete a notification."""
    result = await db.execute(
        select(Notification)
        .where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id
        )
    )
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    await db.delete(notification)
    await db.commit()

    return {"message": "Notification deleted"}
