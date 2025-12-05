"""
家族グループ管理のPydanticモデル
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime


# ============================================
# 家族グループ関連モデル
# ============================================

class FamilyCreate(BaseModel):
    """家族グループ作成リクエスト"""
    name: str = Field(..., min_length=1, max_length=50, description="家族グループ名")
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "田中家"
            }
        }


class FamilyResponse(BaseModel):
    """家族グループレスポンス"""
    familyId: str
    name: str
    inviteCode: str
    createdBy: str
    createdAt: datetime
    updatedAt: datetime
    memberCount: Optional[int] = 0
    
    class Config:
        json_schema_extra = {
            "example": {
                "familyId": "family123",
                "name": "田中家",
                "inviteCode": "ABC123",
                "createdBy": "user123",
                "createdAt": "2024-12-05T10:00:00Z",
                "updatedAt": "2024-12-05T10:00:00Z",
                "memberCount": 3
            }
        }


class FamilyUpdate(BaseModel):
    """家族グループ更新リクエスト"""
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "田中ファミリー"
            }
        }


class FamilyListResponse(BaseModel):
    """所属家族一覧レスポンス"""
    familyId: str
    name: str
    inviteCode: str
    role: str  # 'admin' | 'member'
    memberCount: int
    joinedAt: datetime
    
    class Config:
        json_schema_extra = {
            "example": {
                "familyId": "family123",
                "name": "田中家",
                "inviteCode": "ABC123",
                "role": "admin",
                "memberCount": 3,
                "joinedAt": "2024-12-05T10:00:00Z"
            }
        }


# ============================================
# メンバー関連モデル
# ============================================

class FamilyMemberResponse(BaseModel):
    """家族メンバーレスポンス"""
    userId: str
    displayName: str
    email: str
    role: str  # 'admin' | 'member'
    joinedAt: datetime
    photoURL: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "userId": "user123",
                "displayName": "田中太郎",
                "email": "taro@example.com",
                "role": "admin",
                "joinedAt": "2024-12-05T10:00:00Z",
                "photoURL": None
            }
        }


class MemberRoleUpdate(BaseModel):
    """メンバー権限変更リクエスト"""
    role: str = Field(..., pattern="^(admin|member)$", description="権限 (admin | member)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "role": "admin"
            }
        }


# ============================================
# 招待関連モデル
# ============================================

class InvitationCreate(BaseModel):
    """招待作成リクエスト（メールアドレス指定）"""
    email: EmailStr = Field(..., description="招待するメールアドレス")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "friend@example.com"
            }
        }


class InvitationResponse(BaseModel):
    """招待レスポンス"""
    invitationId: str
    familyId: str
    email: str
    inviteCode: str
    status: str  # 'pending' | 'accepted' | 'expired'
    invitedBy: str
    invitedByName: Optional[str] = None
    expiresAt: datetime
    createdAt: datetime
    acceptedAt: Optional[datetime] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "invitationId": "inv123",
                "familyId": "family123",
                "email": "friend@example.com",
                "inviteCode": "ABC123",
                "status": "pending",
                "invitedBy": "user123",
                "invitedByName": "田中太郎",
                "expiresAt": "2024-12-12T10:00:00Z",
                "createdAt": "2024-12-05T10:00:00Z",
                "acceptedAt": None
            }
        }


class InvitationAccept(BaseModel):
    """招待承認リクエスト（招待コード入力）"""
    inviteCode: str = Field(..., min_length=6, max_length=6, description="6桁の招待コード")
    
    class Config:
        json_schema_extra = {
            "example": {
                "inviteCode": "ABC123"
            }
        }


class InvitationAcceptResponse(BaseModel):
    """招待承認レスポンス"""
    familyId: str
    familyName: str
    role: str
    joinedAt: datetime
    
    class Config:
        json_schema_extra = {
            "example": {
                "familyId": "family123",
                "familyName": "田中家",
                "role": "member",
                "joinedAt": "2024-12-05T10:00:00Z"
            }
        }