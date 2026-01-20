import importlib
import logging
import pkgutil
from typing import Type

from app.integrations.base import BaseIntegration

logger = logging.getLogger(__name__)


class IntegrationRegistry:
    """Registry of all available integrations."""

    _integrations: dict[str, Type[BaseIntegration]] = {}

    @classmethod
    def register(cls, integration_class: Type[BaseIntegration]):
        """Register an integration."""
        cls._integrations[integration_class.CODE] = integration_class
        logger.info(f"Registered integration: {integration_class.CODE}")

    @classmethod
    def get(cls, code: str) -> Type[BaseIntegration] | None:
        """Get integration class by code."""
        return cls._integrations.get(code)

    @classmethod
    def get_all(cls) -> dict[str, Type[BaseIntegration]]:
        """Get all registered integrations."""
        return cls._integrations.copy()

    @classmethod
    def discover_modules(cls):
        """Automatically discover integration modules."""
        try:
            from app.integrations import modules

            for importer, modname, ispkg in pkgutil.iter_modules(modules.__path__):
                try:
                    module = importlib.import_module(
                        f"app.integrations.modules.{modname}"
                    )
                    if hasattr(module, "Integration"):
                        cls.register(module.Integration)
                except Exception as e:
                    logger.error(f"Failed to load integration module {modname}: {e}")
        except ImportError:
            logger.warning("No integration modules found")


def register_integration(cls):
    """Decorator for registering integrations."""
    IntegrationRegistry.register(cls)
    return cls
