import os
import firebase_admin
from firebase_admin import credentials, auth
from google.cloud import firestore
from app.core.settings import settings
from app.utils.logger import logger

_firestore_client = None

def init_firebase():
    """Firebase初期化"""
    global _firestore_client
    
    # すでに初期化されている場合はスキップ
    if len(firebase_admin._apps) > 0:
        logger.info("Firebase already initialized")
        return
    
    if settings.USE_FIREBASE_EMULATOR:
        logger.info("Connecting to Firebase Emulator")
        
        # 環境変数を設定
        os.environ["FIRESTORE_EMULATOR_HOST"] = settings.FIRESTORE_EMULATOR_HOST
        os.environ["FIREBASE_AUTH_EMULATOR_HOST"] = settings.FIREBASE_AUTH_EMULATOR_HOST
        os.environ["GCLOUD_PROJECT"] = settings.FIREBASE_PROJECT_ID
        
        logger.debug(f"FIRESTORE_EMULATOR_HOST: {settings.FIRESTORE_EMULATOR_HOST}")
        logger.debug(f"FIREBASE_AUTH_EMULATOR_HOST: {settings.FIREBASE_AUTH_EMULATOR_HOST}")
        
        # Firebase Admin SDK（Authのみ）を初期化
        firebase_admin.initialize_app(options={
            'projectId': settings.FIREBASE_PROJECT_ID,
        })
        
        # Firestore クライアントを直接作成（エミュレータ用）
        _firestore_client = firestore.Client(project=settings.FIREBASE_PROJECT_ID)
        
        logger.info("Firebase Emulator initialized successfully")
        
    else:
        logger.info("Connecting to Production Firebase")
        
        if not settings.FIREBASE_CREDENTIALS_PATH:
            raise ValueError("FIREBASE_CREDENTIALS_PATH is required for production")
        
        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
        firebase_admin.initialize_app(cred)
        
        # 本番用Firestoreクライアント
        from firebase_admin import firestore as admin_firestore
        _firestore_client = admin_firestore.client()
        
        logger.info("Production Firebase initialized successfully")

def get_firestore_client():
    """Firestoreクライアント取得"""
    global _firestore_client
    
    if _firestore_client is None:
        raise RuntimeError("Firestore client not initialized. Call init_firebase() first.")
    
    return _firestore_client

def get_auth_client():
    """Firebase Authクライアント取得"""
    return auth