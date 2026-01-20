import json
from functools import lru_cache
from pathlib import Path

SUPPORTED_LANGUAGES = ["uk", "en"]
DEFAULT_LANGUAGE = "uk"


@lru_cache
def load_translations(language: str) -> dict:
    """Load translations for a language."""
    if language not in SUPPORTED_LANGUAGES:
        language = DEFAULT_LANGUAGE

    path = Path(__file__).parent / "translations" / f"{language}.json"
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def t(key: str, language: str = DEFAULT_LANGUAGE, **kwargs) -> str:
    """Get translation by key.

    Supports nested keys: "tickets.status.new"
    """
    translations = load_translations(language)

    # Support nested keys
    keys = key.split(".")
    value = translations
    for k in keys:
        if isinstance(value, dict):
            value = value.get(k, key)
        else:
            break

    if isinstance(value, str) and kwargs:
        try:
            return value.format(**kwargs)
        except KeyError:
            return value

    return value if isinstance(value, str) else key


def get_status_translation(status: str, language: str = DEFAULT_LANGUAGE) -> str:
    """Get translated ticket status."""
    return t(f"tickets.status.{status}", language)


def get_priority_translation(priority: str, language: str = DEFAULT_LANGUAGE) -> str:
    """Get translated ticket priority."""
    return t(f"tickets.priority.{priority}", language)


def get_category_translation(category: str, language: str = DEFAULT_LANGUAGE) -> str:
    """Get translated ticket category."""
    return t(f"tickets.category.{category}", language)
