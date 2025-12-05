from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    """アプリケーション設定"""
    
    # Firebase設定
    USE_FIREBASE_EMULATOR: bool = False
    FIRESTORE_EMULATOR_HOST: str = "firebase-emulator:8080"
    FIREBASE_AUTH_EMULATOR_HOST: str = "firebase-emulator:9099"
    FIREBASE_CREDENTIALS_PATH: Optional[str] = None
    FIREBASE_PROJECT_ID: str = "demo-project"
    
    # API設定
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = True
    
    # CORS設定
    CORS_ORIGINS: list[str] = ["*"]
    
    # ログレベル
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
