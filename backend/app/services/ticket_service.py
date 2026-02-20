from datetime import datetime
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.department import Department
from app.models.ticket import Ticket
from app.models.user import User


class TicketService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def auto_assign_ticket(
        self,
        ticket: Ticket,
        department: Department,
    ) -> Optional[User]:
        """
        Automatic ticket assignment within department.
        Algorithm: Round-robin with load balancing.
        """
        # Get active users in department
        result = await self.db.execute(
            select(User).where(
                User.department_id == department.id,
                User.is_active == True,
            )
        )
        users = result.scalars().all()

        if not users:
            return None

        # Count current load for each user
        user_loads = {}
        for user in users:
            count_result = await self.db.execute(
                select(func.count(Ticket.id)).where(
                    Ticket.assigned_user_id == user.id,
                    Ticket.status.in_(["new", "in_progress"]),
                )
            )
            user_loads[user.id] = count_result.scalar()

        # Select least loaded user
        min_load = min(user_loads.values())
        candidates = [u for u in users if user_loads[u.id] == min_load]

        # If multiple users with same load, pick the one who hasn't received
        # a ticket for the longest time
        if len(candidates) > 1:
            last_assigned = {}
            for user in candidates:
                last_result = await self.db.execute(
                    select(func.max(Ticket.created_at)).where(
                        Ticket.assigned_user_id == user.id
                    )
                )
                last_assigned[user.id] = last_result.scalar() or datetime.min

            candidates.sort(key=lambda u: last_assigned[u.id])

        return candidates[0] if candidates else None

    async def calculate_sla_due_date(
        self,
        ticket: Ticket,
        priority: str,
    ) -> datetime:
        """Calculate SLA due date based on priority."""
        # SLA times in hours
        sla_times = {
            "critical": 4,
            "high": 8,
            "medium": 24,
            "low": 72,
        }

        hours = sla_times.get(priority, 24)
        from datetime import timedelta
        return datetime.utcnow() + timedelta(hours=hours)

    async def check_sla_breach(self, ticket: Ticket) -> bool:
        """Check if ticket has breached SLA."""
        if not ticket.sla_due_date:
            return False

        if ticket.status in ["reviewing", "closed"]:
            return False

        return datetime.utcnow() > ticket.sla_due_date
