from fastapi import APIRouter, HTTPException, Depends, status
from app.models.user import UserCreate, UserResponse, UserInDB, LoginRequest
from app.services.auth_service import AuthService
from app.dependencies import get_auth_service, get_current_user

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    auth_service: AuthService = Depends(get_auth_service)
):
    """ユーザー新規登録"""
    try:
        result = auth_service.register_user(user_data)
        return result
        
    except ValueError as e:
        if "already exists" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        print(f"登録エラー: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login")
async def login(
    login_data: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """ユーザーログイン（メールアドレス・パスワード）"""
    try:
        print(f"🔹 ログイン開始: {login_data.email}")
        
        # Firebase Authenticationでログイン処理
        # 注意: Firebase Admin SDKには直接ログイン機能がないため、
        # クライアント側でFirebase Authenticationを使用する
        # ここではユーザーの存在確認のみ行う
        
        # メールアドレスでユーザーを検索
        from firebase_admin import auth
        try:
            user = auth.get_user_by_email(login_data.email)
            print(f"✅ ユーザー確認成功: {user.uid}")
            
            # Firestoreからユーザー情報を取得
            user_data = auth_service.get_user_by_uid(user.uid)
            
            return {
                "success": True,
                "message": "User found. Please authenticate with Firebase on client side.",
                "uid": user.uid,
                "email": user.email,
                "displayName": user.display_name
            }
            
        except auth.UserNotFoundError:
            print(f"❌ ユーザーが見つかりません: {login_data.email}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ ログインエラー: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

@router.post("/debug/get-token")
async def debug_get_token(
    login_data: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    デバッグ用: Firebase ID Token取得
    
    ⚠️ 開発環境専用 - 本番環境では削除すること
    """
    try:
        from firebase_admin import auth
        
        # メールアドレスでユーザーを検索
        user = auth.get_user_by_email(login_data.email)
        
        # カスタムトークン生成
        custom_token = auth.create_custom_token(user.uid)
        
        # Firebase REST APIを使ってID Tokenに変換
        # 注意: これは通常クライアント側で行う処理
        import requests
        
        # Firebase Auth Emulator用のエンドポイント
        emulator_url = "http://firebase-emulator:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key"
        
        response = requests.post(
            emulator_url,
            json={
                "token": custom_token.decode('utf-8'),
                "returnSecureToken": True
            }
        )
        
        if response.status_code == 200:
            token_data = response.json()
            return {
                "success": True,
                "uid": user.uid,
                "email": user.email,
                "displayName": user.display_name,
                "idToken": token_data["idToken"],
                "refreshToken": token_data["refreshToken"],
                "expiresIn": token_data["expiresIn"]
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get ID token: {response.text}"
            )
        
    except auth.UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    except Exception as e:
        print(f"❌ トークン取得エラー: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token generation failed: {str(e)}"
        )

@router.get("/me", response_model=UserInDB)
async def get_current_user_info(
    current_user: dict = Depends(get_current_user)
):
    """現在のユーザー情報を取得"""
    auth_service = AuthService()
    
    try:
        user = auth_service.get_user_by_uid(current_user["uid"])
        return user
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

@router.put("/me", response_model=UserInDB)
async def update_user_info(
    display_name: str = None,
    photo_url: str = None,
    current_user: dict = Depends(get_current_user)
):
    """ユーザー情報を更新"""
    auth_service = AuthService()
    
    try:
        user = auth_service.update_user(
            uid=current_user["uid"],
            display_name=display_name,
            photo_url=photo_url
        )
        return user
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )