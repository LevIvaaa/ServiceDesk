import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.registry import IntegrationRegistry
from app.models.integration import Integration, IntegrationLog

logger = logging.getLogger(__name__)


class IntegrationDispatcher:
    """Event dispatcher for integrations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def dispatch(self, event: str, data: dict) -> list[dict]:
        """Dispatch event to all subscribed integrations."""
        results = []

        # Get active integrations with this hook
        result = await self.db.execute(
            select(Integration).where(
                Integration.is_enabled == True,
                Integration.hooks.contains([event]),
            )
        )

        for integration_model in result.scalars():
            integration_class = IntegrationRegistry.get(integration_model.code)
            if not integration_class:
                continue

            try:
                integration = integration_class(integration_model.config or {})

                # Call corresponding method
                method_name = f"on_{event.replace('.', '_')}"
                if hasattr(integration, method_name):
                    method_result = await getattr(integration, method_name)(data)

                    # Log result
                    await self._log_event(
                        integration_model.id,
                        event,
                        data,
                        method_result,
                        "success",
                    )

                    results.append({
                        "integration": integration_model.code,
                        "status": "success",
                        "result": method_result,
                    })
            except Exception as e:
                logger.error(
                    f"Integration {integration_model.code} failed for event {event}: {e}"
                )
                await self._log_event(
                    integration_model.id,
                    event,
                    data,
                    None,
                    "error",
                    str(e),
                )
                results.append({
                    "integration": integration_model.code,
                    "status": "error",
                    "error": str(e),
                })

        return results

    async def _log_event(
        self,
        integration_id: int,
        event: str,
        payload: dict,
        response: Any,
        status: str,
        error: str | None = None,
    ):
        """Log integration event."""
        log = IntegrationLog(
            integration_id=integration_id,
            event_type=event,
            direction="outbound",
            payload=payload,
            response=response if isinstance(response, dict) else {"result": str(response)},
            status=status,
            error_message=error,
        )
        self.db.add(log)
        await self.db.commit()
