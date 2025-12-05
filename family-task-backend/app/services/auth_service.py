from datetime import datetime
from app.models.user import UserCreate, UserResponse, UserInDB
from app.config import get_firestore_client, get_auth_client
from app.utils.logger import logger

class AuthService:
    def __init__(self):
        self._db = None
        self._auth = None
    
    @property
    def db(self):
        """Firestoreクライアントの遅延初期化"""
        if self._db is None:
            logger.debug("Getting Firestore client...")
            self._db = get_firestore_client()
            logger.debug("Firestore client obtained successfully")
        return self._db
    
    @property
    def auth(self):
        """Firebase Authクライアントの遅延初期化"""
        if self._auth is None:
            self._auth = get_auth_client()
        return self._auth
    
    def register_user(self, user_data: UserCreate) -> UserResponse:
        """ユーザー新規登録"""
        try:
            logger.info(f"Starting user registration: {user_data.email}")
            
            # Firebase Authenticationでユーザー作成
            logger.debug("Creating user in Firebase Auth...")
            user = self.auth.create_user(
                email=user_data.email,
                password=user_data.password,
                display_name=user_data.displayName
            )
            logger.info(f"Firebase Auth user created: {user.uid}")
            
            # Firestoreにユーザー情報を保存
            logger.debug("Saving user data to Firestore...")
            now = datetime.utcnow()
            user_doc = {
                "uid": user.uid,
                "email": user_data.email,
                "displayName": user_data.displayName,
                "photoURL": None,
                "createdAt": now,
                "updatedAt": now
            }
            
            self.db.collection("Users").document(user.uid).set(user_doc)
            logger.info("User data saved to Firestore successfully")
            
            # カスタムトークン生成
            logger.debug("Generating custom token...")
            custom_token = self.auth.create_custom_token(user.uid)
            logger.info("Custom token generated successfully")
            
            return UserResponse(
                uid=user.uid,
                email=user_data.email,
                displayName=user_data.displayName,
                photoURL=None,
                createdAt=now,
                customToken=custom_token.decode('utf-8')
            )
            
        except Exception as e:
            logger.error(f"Registration error: {str(e)}", exc_info=True)
            
            if "already exists" in str(e).lower():
                raise ValueError("Email already exists")
            raise Exception(f"Registration failed: {str(e)}")
    
    def get_user_by_uid(self, uid: str) -> UserInDB:
        """UIDからユーザー情報を取得"""
        user_doc = self.db.collection("Users").document(uid).get()
        
        if not user_doc.exists:
            raise ValueError("User not found")
        
        user_data = user_doc.to_dict()
        return UserInDB(**user_data)
    
    def update_user(self, uid: str, display_name: str = None, photo_url: str = None) -> UserInDB:
        """ユーザー情報を更新"""
        update_data = {"updatedAt": datetime.utcnow()}
        
        if display_name:
            update_data["displayName"] = display_name
            self.auth.update_user(uid, display_name=display_name)
        
        if photo_url:
            update_data["photoURL"] = photo_url
            self.auth.update_user(uid, photo_url=photo_url)
        
        self.db.collection("Users").document(uid).update(update_data)
        
        return self.get_user_by_uid(uid)
    
    def verify_id_token(self, id_token: str) -> dict:
        """Firebase ID Tokenを検証"""
        try:
            decoded_token = self.auth.verify_id_token(id_token)
            return decoded_token
        except Exception as e:
            raise ValueError(f"Invalid token: {str(e)}")