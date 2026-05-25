from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "CareerBridge AI API"
    env: str = "dev"
    database_url: str = "sqlite:///./careerbridge.db"
    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    # Access tokens live for a full day so users aren't signed out in the middle of a
    # session; refresh tokens live for a month so they can come back and pick up where
    # they left off without re-entering credentials.
    access_token_minutes: int = 60 * 24
    refresh_token_minutes: int = 60 * 24 * 30
    # OpenAI direct (used for Whisper STT + gpt-4o-mini TTS — OpenRouter does
    # not implement the /audio/transcriptions or /audio/speech endpoints).
    openai_api_key: str | None = None
    openai_stt_model: str = "whisper-1"
    openai_tts_model: str = "gpt-4o-mini-tts"
    # OpenRouter (used only for chat completions).
    openrouter_api_key: str | None = None
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_chat_model: str = "google/gemini-2.5-flash"
    aws_region: str = "ap-south-1"
    s3_bucket: str = "careerbridge-private"
    max_upload_size_mb: int = 5
    allowed_resume_extensions: str = ".pdf,.doc,.docx"
    # SMTP (optional — if unset, email-service falls back to logging)
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from: str = "CareerBridge AI <no-reply@careerbridge.ai>"
    smtp_use_tls: bool = True
    app_web_base: str = "http://localhost:3000"
    # Shared secret required in the X-Cron-Secret header for /internal/* endpoints.
    # Set in apps/api/.env.docker; never committed.
    internal_cron_secret: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
