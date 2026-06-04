import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./zetheta_admin_v2.db"
    SOURCE_URL_TECH: str = "https://www.zetheta.com/wp-json/v1/submissions"
    SOURCE_URL_NONTECH: str = "https://www.zetheta.com/wp-json/v1/submissions/?type=nontech"
    TARGET_URL_TECH: str = "http://13.127.165.204:8000/api/zetheta/analyze"
    TARGET_URL_NONTECH: str = "http://13.127.165.204:8000/api/v2/zetheta/analyze/document"
    MAX_CONCURRENT_CALLS: int = 3
    CALL_DELAY_SECONDS: float = 1.0
    CALL_TIMEOUT_SECONDS: int = 90
    MAX_RETRIES: int = 3
    API_PREFIX: str = "/api"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    class Config:
        env_file = ".env"


settings = Settings()
