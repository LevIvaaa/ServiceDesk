from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.models.ticket import Ticket
from app.models.station import Station
from app.models.user import User

router = APIRouter()


@router.get("/stats")
async def get_dashboard_stats(
    db: DbSession,
    current_user: CurrentUser,
):
    """Get dashboard statistics."""
    # Tickets by status
    status_counts = {}
    for status in ["new", "open", "in_progress", "pending", "resolved", "closed"]:
        result = await db.execute(
            select(func.count()).where(Ticket.status == status)
        )
        status_counts[status] = result.scalar()

    # Tickets by priority
    priority_counts = {}
    for priority in ["low", "medium", "high", "critical"]:
        result = await db.execute(
            select(func.count()).where(
                Ticket.priority == priority,
                Ticket.status.not_in(["resolved", "closed"]),
            )
        )
        priority_counts[priority] = result.scalar()

    # Total tickets
    total_result = await db.execute(select(func.count()).select_from(Ticket))
    total_tickets = total_result.scalar()

    # Open tickets
    open_result = await db.execute(
        select(func.count()).where(Ticket.status.not_in(["resolved", "closed"]))
    )
    open_tickets = open_result.scalar()

    # SLA breached
    sla_result = await db.execute(
        select(func.count()).where(
            Ticket.sla_breached == True,
            Ticket.status.not_in(["resolved", "closed"]),
        )
    )
    sla_breached = sla_result.scalar()

    # Tickets created today
    today = datetime.utcnow().date()
    today_result = await db.execute(
        select(func.count()).where(
            func.date(Ticket.created_at) == today
        )
    )
    created_today = today_result.scalar()

    # Tickets resolved today
    resolved_today_result = await db.execute(
        select(func.count()).where(
            func.date(Ticket.resolved_at) == today
        )
    )
    resolved_today = resolved_today_result.scalar()

    # Average resolution time (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    avg_result = await db.execute(
        select(func.avg(
            func.extract('epoch', Ticket.resolved_at - Ticket.created_at) / 3600
        )).where(
            Ticket.resolved_at.isnot(None),
            Ticket.created_at >= thirty_days_ago,
        )
    )
    avg_resolution_hours = avg_result.scalar() or 0

    return {
        "tickets_by_status": status_counts,
        "tickets_by_priority": priority_counts,
        "total_tickets": total_tickets,
        "open_tickets": open_tickets,
        "sla_breached": sla_breached,
        "created_today": created_today,
        "resolved_today": resolved_today,
        "avg_resolution_hours": round(avg_resolution_hours, 1),
    }


@router.get("/my-tickets")
async def get_my_tickets(
    db: DbSession,
    current_user: CurrentUser,
    limit: int = Query(10, ge=1, le=50),
):
    """Get current user's assigned tickets."""
    result = await db.execute(
        select(Ticket)
        .options(
            selectinload(Ticket.station).selectinload(Station.operator),
            selectinload(Ticket.created_by),
        )
        .where(
            Ticket.assigned_user_id == current_user.id,
            Ticket.status.not_in(["resolved", "closed"]),
        )
        .order_by(
            # Critical first, then by SLA due date
            Ticket.priority.desc(),
            Ticket.sla_due_date.asc().nullslast(),
            Ticket.created_at.desc(),
        )
        .limit(limit)
    )
    tickets = result.scalars().all()

    return [
        {
            "id": t.id,
            "ticket_number": t.ticket_number,
            "title": t.title,
            "priority": t.priority,
            "status": t.status,
            "category": t.category,
            "created_at": t.created_at,
            "sla_due_date": t.sla_due_date,
            "sla_breached": t.sla_breached,
            "station": {
                "station_id": t.station.station_id,
                "external_id": t.station.external_id,
                "address": t.station.address,
            } if t.station else None,
        }
        for t in tickets
    ]


@router.get("/recent")
async def get_recent_activity(
    db: DbSession,
    current_user: CurrentUser,
    limit: int = Query(20, ge=1, le=100),
):
    """Get recent ticket activity."""
    # Recent tickets (created or updated)
    result = await db.execute(
        select(Ticket)
        .options(
            selectinload(Ticket.assigned_user),
            selectinload(Ticket.created_by),
        )
        .order_by(Ticket.updated_at.desc())
        .limit(limit)
    )
    tickets = result.scalars().all()

    return [
        {
            "id": t.id,
            "ticket_number": t.ticket_number,
            "title": t.title,
            "status": t.status,
            "priority": t.priority,
            "updated_at": t.updated_at,
            "assigned_user": {
                "id": t.assigned_user.id,
                "first_name": t.assigned_user.first_name,
                "last_name": t.assigned_user.last_name,
            } if t.assigned_user else None,
            "created_by": {
                "id": t.created_by.id,
                "first_name": t.created_by.first_name,
                "last_name": t.created_by.last_name,
            },
        }
        for t in tickets
    ]


@router.get("/tickets-chart")
async def get_tickets_chart_data(
    db: DbSession,
    current_user: CurrentUser,
    days: int = Query(30, ge=7, le=90),
):
    """Get ticket creation/resolution data for chart."""
    start_date = datetime.utcnow() - timedelta(days=days)

    # Tickets created per day
    created_result = await db.execute(
        select(
            func.date(Ticket.created_at).label("date"),
            func.count().label("count"),
        )
        .where(Ticket.created_at >= start_date)
        .group_by(func.date(Ticket.created_at))
        .order_by(func.date(Ticket.created_at))
    )
    created_data = {str(row.date): row.count for row in created_result}

    # Tickets resolved per day
    resolved_result = await db.execute(
        select(
            func.date(Ticket.resolved_at).label("date"),
            func.count().label("count"),
        )
        .where(Ticket.resolved_at >= start_date)
        .group_by(func.date(Ticket.resolved_at))
        .order_by(func.date(Ticket.resolved_at))
    )
    resolved_data = {str(row.date): row.count for row in resolved_result}

    # Build chart data
    chart_data = []
    current_date = start_date.date()
    end_date = datetime.utcnow().date()

    while current_date <= end_date:
        date_str = str(current_date)
        chart_data.append({
            "date": date_str,
            "created": created_data.get(date_str, 0),
            "resolved": resolved_data.get(date_str, 0),
        })
        current_date += timedelta(days=1)

    return chart_data
