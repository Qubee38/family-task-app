from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import get_auth_client, get_firestore_client
from app.services.auth_service import AuthService
from app.utils.logger import logger

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """現在のユーザーを取得（Firebase ID Token検証）"""
    try:
        auth = get_auth_client()
        
        # Firebase ID Tokenを検証
        decoded_token = auth.verify_id_token(credentials.credentials)
        
        logger.debug(f"Token verified for user: {decoded_token['uid']}")
        
        # Firestoreからユーザー情報を取得
        db = get_firestore_client()
        user_ref = db.collection("Users").document(decoded_token["uid"])
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            logger.warning(f"User not found in Firestore: {decoded_token['uid']}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user_data = user_doc.to_dict()
        logger.debug(f"User data retrieved: {user_data['email']}")
        
        return {
            "uid": decoded_token["uid"],
            "email": decoded_token.get("email"),
            "email_verified": decoded_token.get("email_verified", False),
            **user_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"認証に失敗しました: {str(e)}"
        )

def get_auth_service() -> AuthService:
    """AuthServiceインスタンス取得（遅延初期化）"""
    return AuthService()

async def get_db():
    """Firestoreクライアント取得"""
    return get_firestore_client()

async def check_family_membership(
    family_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
) -> dict:
    """家族メンバーシップを確認"""
    user_id = current_user["uid"]
    
    # FamilyMembersコレクションを確認
    member_ref = db.collection("FamilyMembers").document(f"{user_id}_{family_id}")
    member = member_ref.get()
    
    if not member.exists:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this family"
        )
    
    return member.to_dict()

async def check_admin_role(
    family_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
) -> dict:
    """管理者権限を確認"""
    member = await check_family_membership(family_id, current_user, db)
    
    if member.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin permission required"
        )
    
    return member