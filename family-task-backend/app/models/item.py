"""
アイテム（タスク/予定/必要物）のデータモデル
"""
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field


# ========================================
# 繰り返し設定
# ========================================
class RecurrenceModel(BaseModel):
    """繰り返し設定"""
    frequency: Literal['daily', 'weekly', 'monthly', 'yearly']
    interval: int = Field(ge=1, description="繰り返し間隔（1以上）")
    endDate: Optional[datetime] = Field(None, description="繰り返し終了日")


# ========================================
# アイテム作成リクエスト
# ========================================
class ItemCreateRequest(BaseModel):
    """アイテム作成リクエスト"""
    type: Literal['task', 'event', 'need']
    title: str = Field(min_length=1, max_length=100, description="タイトル")
    categoryId: str = Field(description="カテゴリID")
    assignedTo: Optional[str] = Field(None, description="担当者UID")
    priority: Literal['high', 'medium', 'low'] = Field(default='low', description="優先度")
    location: Optional[str] = Field(None, max_length=100, description="場所")
    visibility: Literal['family', 'private'] = Field(default='family', description="公開範囲")
    
    # 日時関連
    startDateTime: Optional[datetime] = Field(None, description="開始日時（event用）")
    endDateTime: Optional[datetime] = Field(None, description="終了日時/期限")
    
    # 繰り返し設定
    recurrence: Optional[RecurrenceModel] = Field(None, description="繰り返し設定")

    class Config:
        json_schema_extra = {
            "example": {
                "type": "task",
                "title": "庭の草刈り",
                "categoryId": "cat123",
                "assignedTo": "abc123xyz",
                "priority": "high",
                "location": "庭",
                "visibility": "family",
                "endDateTime": "2024-12-10T00:00:00Z"
            }
        }


# ========================================
# アイテム更新リクエスト
# ========================================
class ItemUpdateRequest(BaseModel):
    """アイテム更新リクエスト"""
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    categoryId: Optional[str] = None
    assignedTo: Optional[str] = None
    priority: Optional[Literal['high', 'medium', 'low']] = None
    location: Optional[str] = Field(None, max_length=100)
    visibility: Optional[Literal['family', 'private']] = None
    startDateTime: Optional[datetime] = None
    endDateTime: Optional[datetime] = None
    recurrence: Optional[RecurrenceModel] = None

    class Config:
        json_schema_extra = {
            "example": {
                "title": "庭の草刈りと剪定",
                "priority": "medium",
                "endDateTime": "2024-12-12T00:00:00Z"
            }
        }


# ========================================
# アイテム完了リクエスト
# ========================================
class ItemCompleteRequest(BaseModel):
    """アイテム完了リクエスト"""
    completedBy: str = Field(description="完了者のUID")

    class Config:
        json_schema_extra = {
            "example": {
                "completedBy": "abc123xyz"
            }
        }


# ========================================
# アイテムレスポンス
# ========================================
class ItemResponse(BaseModel):
    """アイテムレスポンス"""
    itemId: str
    familyId: str
    type: Literal['task', 'event', 'need']
    title: str
    categoryId: str
    categoryName: Optional[str] = None  # 結合情報
    assignedTo: Optional[str] = None
    assignedToName: Optional[str] = None  # 結合情報
    priority: Literal['high', 'medium', 'low']
    location: Optional[str] = None
    visibility: Literal['family', 'private']
    isCompleted: bool
    completedAt: Optional[datetime] = None
    completedBy: Optional[str] = None
    completedByName: Optional[str] = None  # 結合情報
    startDateTime: Optional[datetime] = None
    endDateTime: Optional[datetime] = None
    recurrence: Optional[RecurrenceModel] = None
    createdBy: str
    createdByName: Optional[str] = None  # 結合情報
    createdAt: datetime
    updatedAt: datetime

    class Config:
        json_schema_extra = {
            "example": {
                "itemId": "item123",
                "familyId": "fam123",
                "type": "task",
                "title": "庭の草刈り",
                "categoryId": "cat123",
                "categoryName": "庭の手入れ",
                "assignedTo": "abc123xyz",
                "assignedToName": "山田太郎",
                "priority": "high",
                "location": "庭",
                "visibility": "family",
                "isCompleted": False,
                "endDateTime": "2024-12-10T00:00:00Z",
                "createdBy": "def456uvw",
                "createdByName": "山田花子",
                "createdAt": "2024-12-01T10:00:00Z",
                "updatedAt": "2024-12-01T10:00:00Z"
            }
        }


# ========================================
# カテゴリ作成リクエスト
# ========================================
class CategoryCreateRequest(BaseModel):
    """カテゴリ作成リクエスト"""
    name: str = Field(min_length=1, max_length=20, description="カテゴリ名")
    suggestedFor: list[Literal['task', 'event', 'need']] = Field(
        default_factory=list, 
        description="推奨表示対象"
    )
    points: Optional[int] = Field(None, ge=0, description="獲得ポイント")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "ペットの世話",
                "suggestedFor": ["task", "event"],
                "points": 8
            }
        }


# ========================================
# カテゴリレスポンス
# ========================================
class CategoryResponse(BaseModel):
    """カテゴリレスポンス"""
    categoryId: str
    familyId: str
    name: str
    suggestedFor: list[Literal['task', 'event', 'need']]
    isDefault: bool
    usageCount: int
    points: Optional[int] = None
    createdBy: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        json_schema_extra = {
            "example": {
                "categoryId": "cat123",
                "familyId": "fam123",
                "name": "庭の手入れ",
                "suggestedFor": ["task"],
                "isDefault": True,
                "usageCount": 12,
                "points": 15,
                "createdBy": "abc123xyz",
                "createdAt": "2024-12-01T10:00:00Z",
                "updatedAt": "2024-12-01T10:00:00Z"
            }
        }