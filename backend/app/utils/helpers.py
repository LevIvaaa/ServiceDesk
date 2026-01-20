import re
from datetime import datetime
from typing import Any


def slugify(text: str) -> str:
    """Convert text to URL-friendly slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[-\s]+", "-", text)
    return text


def format_datetime(dt: datetime | None, format_str: str = "%Y-%m-%d %H:%M") -> str:
    """Format datetime to string."""
    if dt is None:
        return ""
    return dt.strftime(format_str)


def truncate(text: str, max_length: int = 100, suffix: str = "...") -> str:
    """Truncate text to max length."""
    if len(text) <= max_length:
        return text
    return text[: max_length - len(suffix)] + suffix


def dict_diff(old: dict, new: dict) -> tuple[dict, dict]:
    """Get differences between two dicts."""
    old_values = {}
    new_values = {}

    all_keys = set(old.keys()) | set(new.keys())

    for key in all_keys:
        old_val = old.get(key)
        new_val = new.get(key)
        if old_val != new_val:
            old_values[key] = old_val
            new_values[key] = new_val

    return old_values, new_values


def mask_sensitive(data: dict, keys: list[str] = None) -> dict:
    """Mask sensitive data in dict."""
    if keys is None:
        keys = ["password", "api_key", "token", "secret"]

    result = data.copy()
    for key in keys:
        if key in result:
            result[key] = "***"
    return result


def parse_phone(phone: str) -> str:
    """Normalize phone number."""
    # Remove all non-digit characters except +
    cleaned = re.sub(r"[^\d+]", "", phone)
    return cleaned
