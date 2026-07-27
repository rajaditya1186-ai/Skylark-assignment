"""
Configuration module for the Business Intelligence Agent.
Loads environment variables and validates settings using pydantic-settings.
"""
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Application settings loaded from environment variables or .env file.
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Monday.com API credentials
    monday_api_token: str = Field(default="", alias="MONDAY_API_TOKEN")
    deals_board_id: str = Field(default="", alias="DEALS_BOARD_ID")
    work_orders_board_id: str = Field(default="", alias="WORK_ORDERS_BOARD_ID")

    # OpenAI API credentials
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")

    # Force mock mode flags (override token checks)
    force_monday_mock: bool = Field(default=False, alias="FORCE_MONDAY_MOCK")
    force_openai_mock: bool = Field(default=False, alias="FORCE_OPENAI_MOCK")

    # CORS origins as a comma-separated string
    cors_origins: str = Field(default="http://localhost:3000,http://localhost:3001", alias="CORS_ORIGINS")

    # Cache TTL for Monday.com data
    cache_ttl_seconds: int = Field(default=300, alias="CACHE_TTL_SECONDS")

    @property
    def cors_origins_list(self) -> List[str]:
        """
        Parses the comma-separated CORS_ORIGINS string into a list.
        """
        if not self.cors_origins:
            return []
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_monday_mock_mode(self) -> bool:
        """
        Determines whether the Monday client should run in mock mode.
        True if MONDAY_API_TOKEN is empty or FORCE_MONDAY_MOCK is True.
        """
        return self.force_monday_mock or not self.monday_api_token.strip()

    @property
    def is_openai_mock_mode(self) -> bool:
        """
        Determines whether the LLM queries should fall back to mock responses.
        True if OPENAI_API_KEY is empty or FORCE_OPENAI_MOCK is True.
        """
        return self.force_openai_mock or not self.openai_api_key.strip()

settings = Settings()
