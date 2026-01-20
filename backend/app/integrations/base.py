from abc import ABC, abstractmethod
from typing import Any


class BaseIntegration(ABC):
    """Base class for all integrations."""

    # Module metadata
    CODE: str = ""  # Unique code
    NAME: str = ""
    VERSION: str = "1.0.0"
    AUTHOR: str = ""
    DESCRIPTION: str = ""

    # Events this module subscribes to
    HOOKS: list[str] = []

    def __init__(self, config: dict):
        self.config = config
        self.is_configured = self.validate_config()

    @abstractmethod
    def validate_config(self) -> bool:
        """Validate configuration."""
        pass

    @abstractmethod
    async def test_connection(self) -> tuple[bool, str]:
        """Test connection to external system."""
        pass

    async def on_ticket_created(self, ticket: dict) -> Any:
        """Hook: ticket created."""
        pass

    async def on_ticket_closed(self, ticket: dict) -> Any:
        """Hook: ticket closed."""
        pass

    async def on_ticket_status_changed(
        self, ticket: dict, old_status: str, new_status: str
    ) -> Any:
        """Hook: ticket status changed."""
        pass

    async def sync_data(self) -> dict:
        """Synchronize data with external system."""
        return {"status": "not_implemented"}

    def get_settings_schema(self) -> dict:
        """JSON Schema for module settings."""
        return {}
