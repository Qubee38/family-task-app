from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# 環境変数読み込み（最優先）
load_dotenv()

from app.core.settings import settings
from app.utils.logger import setup_logger

# ロガーセットアップ
logger = setup_logger("family_task_api", level=settings.LOG_LEVEL)

# Firebase初期化
logger.info("=" * 50)
logger.info("Initializing Firebase...")
logger.info("=" * 50)

from app.config import init_firebase
init_firebase()

logger.info("=" * 50)
logger.info("Firebase initialization complete")
logger.info("=" * 50)

# FastAPIアプリケーション作成
app = FastAPI(
    title="Family Task Management API",
    description="家族向けタスク管理アプリのバックエンドAPI",
    version="1.0.0",
    debug=settings.DEBUG
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ルーター登録
from app.routers import auth

app.include_router(auth.router, prefix="/api/auth", tags=["認証"])

@app.get("/")
def read_root():
    return {
        "message": "Family Task Management API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.on_event("startup")
async def startup_event():
    """アプリケーション起動時の処理"""
    logger.info("Application startup complete")
    logger.info(f"USE_FIREBASE_EMULATOR: {settings.USE_FIREBASE_EMULATOR}")
    logger.info(f"LOG_LEVEL: {settings.LOG_LEVEL}")