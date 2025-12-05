from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# 環境変数読み込み（最優先）
load_dotenv()

# Firebase初期化（アプリケーション起動前に実行）
print("=" * 50)
print("Initializing Firebase...")
print("=" * 50)

from app.config import init_firebase
init_firebase()

print("=" * 50)
print("Firebase initialization complete")
print("=" * 50)

# FastAPIアプリケーション作成
app = FastAPI(
    title="Family Task Management API",
    description="家族向けタスク管理アプリのバックエンドAPI",
    version="1.0.0"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    print("✅ Application startup complete")
    print(f"FIRESTORE_EMULATOR_HOST: {os.getenv('FIRESTORE_EMULATOR_HOST', 'Not set')}")
    print(f"FIREBASE_AUTH_EMULATOR_HOST: {os.getenv('FIREBASE_AUTH_EMULATOR_HOST', 'Not set')}")