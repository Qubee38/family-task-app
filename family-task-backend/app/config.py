import os
import firebase_admin
from firebase_admin import credentials, auth
from google.cloud import firestore
from dotenv import load_dotenv

load_dotenv()

_firestore_client = None

def init_firebase():
    """Firebase初期化"""
    global _firestore_client
    
    # すでに初期化されている場合はスキップ
    if len(firebase_admin._apps) > 0:
        print("✅ Firebase already initialized")
        return
    
    use_emulator = os.getenv("USE_FIREBASE_EMULATOR", "False") == "True"
    
    print(f"USE_FIREBASE_EMULATOR: {use_emulator}")
    
    if use_emulator:
        print("🔧 Firebase Emulatorに接続します")
        
        # 環境変数を設定
        firestore_host = os.getenv("FIRESTORE_EMULATOR_HOST", "firebase-emulator:8080")
        auth_host = os.getenv("FIREBASE_AUTH_EMULATOR_HOST", "firebase-emulator:9099")
        
        os.environ["FIRESTORE_EMULATOR_HOST"] = firestore_host
        os.environ["FIREBASE_AUTH_EMULATOR_HOST"] = auth_host
        os.environ["GCLOUD_PROJECT"] = "demo-project"
        
        print(f"  FIRESTORE_EMULATOR_HOST: {firestore_host}")
        print(f"  FIREBASE_AUTH_EMULATOR_HOST: {auth_host}")
        
        # Firebase Admin SDK（Authのみ）を初期化
        firebase_admin.initialize_app(options={
            'projectId': 'demo-project',
        })
        
        # Firestore クライアントを直接作成（エミュレータ用）
        _firestore_client = firestore.Client(project='demo-project')
        
        print("✅ Firebase Emulator initialized")
        print(f"✅ Firestore client created for emulator")
        
    else:
        print("🔥 本番Firebaseに接続します")
        cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        
        # 本番用Firestoreクライアント
        from firebase_admin import firestore as admin_firestore
        _firestore_client = admin_firestore.client()
        
        print("✅ Firebase initialized")

def get_firestore_client():
    """Firestoreクライアント取得"""
    global _firestore_client
    
    if _firestore_client is None:
        raise RuntimeError("Firestore client not initialized. Call init_firebase() first.")
    
    return _firestore_client

def get_auth_client():
    """Firebase Authクライアント取得"""
    return auth