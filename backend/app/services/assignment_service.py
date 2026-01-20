import logging
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.ticket import Ticket

logger = logging.getLogger(__name__)


class AssignmentService:
    """Service for auto-assigning tickets to users."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_next_assignee(self, department_id: int) -> Optional[User]:
        """
        Get the next user to assign a ticket to using round-robin with workload balancing.

        Strategy:
        1. Get all active users in the department
        2. Count open tickets for each user
        3. Select user with least open tickets
        """
        # Get active users in the department
        users_result = await self.db.execute(
            select(User)
            .where(
                User.department_id == department_id,
                User.is_active == True
            )
        )
        users = list(users_result.scalars().all())

        if not users:
            logger.warning(f"No active users in department {department_id}")
            return None

        # Count open tickets for each user
        user_workloads = []
        open_statuses = ['new', 'open', 'in_progress', 'pending']

        for user in users:
            count_result = await self.db.execute(
                select(func.count(Ticket.id))
                .where(
                    Ticket.assigned_user_id == user.id,
                    Ticket.status.in_(open_statuses)
                )
            )
            ticket_count = count_result.scalar() or 0
            user_workloads.append((user, ticket_count))

        # Sort by workload (ascending) and then by user id for consistency
        user_workloads.sort(key=lambda x: (x[1], x[0].id))

        selected_user = user_workloads[0][0]
        logger.info(
            f"Auto-assigned to user {selected_user.id} ({selected_user.full_name}) "
            f"with {user_workloads[0][1]} open tickets"
        )

        return selected_user

    async def get_department_workload(self, department_id: int) -> list[dict]:
        """
        Get workload statistics for all users in a department.
        Returns list of {user, open_tickets, total_tickets}
        """
        users_result = await self.db.execute(
            select(User)
            .where(
                User.department_id == department_id,
                User.is_active == True
            )
        )
        users = list(users_result.scalars().all())

        workloads = []
        open_statuses = ['new', 'open', 'in_progress', 'pending']

        for user in users:
            # Open tickets count
            open_result = await self.db.execute(
                select(func.count(Ticket.id))
                .where(
                    Ticket.assigned_user_id == user.id,
                    Ticket.status.in_(open_statuses)
                )
            )
            open_count = open_result.scalar() or 0

            # Total tickets count (all time)
            total_result = await self.db.execute(
                select(func.count(Ticket.id))
                .where(Ticket.assigned_user_id == user.id)
            )
            total_count = total_result.scalar() or 0

            workloads.append({
                'user': user,
                'open_tickets': open_count,
                'total_tickets': total_count,
            })

        return workloads
