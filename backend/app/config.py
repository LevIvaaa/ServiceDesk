from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "ECOFACTOR Service Desk"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://ecofactor:changeme@localhost:5432/ecofactor_servicedesk"

    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # OpenAI
    OPENAI_API_KEY: str = ""

    # Qdrant
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Storage
    LOGS_STORAGE_PATH: str = "/app/logs"
    ATTACHMENTS_STORAGE_PATH: str = "/app/attachments"
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50MB

    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@ecofactor.ua"
    EMAIL_FROM_NAME: str = "ECOFACTOR Service Desk"

    # Telegram
    TELEGRAM_BOT_TOKEN: str = ""

    # Frontend
    FRONTEND_URL: str = "http://localhost:3000"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # Localization
    DEFAULT_LANGUAGE: str = "uk"
    SUPPORTED_LANGUAGES: list[str] = ["uk", "en"]

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
