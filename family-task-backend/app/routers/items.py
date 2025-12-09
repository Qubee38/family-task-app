"""
アイテム（タスク/予定/必要物）管理API
"""
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query
from app.dependencies import get_current_user, check_family_membership, check_admin_role
from app.services.item_service import ItemService
from app.models.item import (
    ItemCreateRequest,
    ItemUpdateRequest,
    ItemCompleteRequest,
    ItemResponse,
    CategoryCreateRequest,
    CategoryResponse
)
from app.utils.logger import logger

router = APIRouter(prefix="/families", tags=["Items"])


# ========================================
# アイテム管理エンドポイント
# ========================================

@router.post("/{family_id}/items", response_model=Dict[str, Any], status_code=201)
async def create_item(
    family_id: str,
    item_data: ItemCreateRequest,
    current_user: dict = Depends(get_current_user),
    membership: dict = Depends(check_family_membership)
):
    """
    アイテム作成
    
    - **family_id**: 家族ID
    - **item_data**: アイテムデータ
    
    **権限**: 家族メンバー
    """
    try:
        item = await ItemService.create_item(
            family_id=family_id,
            item_data=item_data,
            created_by_uid=current_user['uid']
        )
        return {
            'success': True,
            'data': item.model_dump()
        }
    except ValueError as e:
        logger.error(f"❌ Failed to create item: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Unexpected error in create_item: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{family_id}/items", response_model=Dict[str, Any])
async def get_items(
    family_id: str,
    type: Optional[str] = Query(None, description="タイプフィルタ（task/event/need）"),
    isCompleted: Optional[bool] = Query(None, description="完了状態フィルタ"),
    assignedTo: Optional[str] = Query(None, description="担当者フィルタ"),
    categoryId: Optional[str] = Query(None, description="カテゴリフィルタ"),
    visibility: Optional[str] = Query(None, description="公開範囲フィルタ（family/private）"),
    limit: int = Query(20, ge=1, le=100, description="取得件数"),
    offset: int = Query(0, ge=0, description="オフセット"),
    current_user: dict = Depends(get_current_user),
    membership: dict = Depends(check_family_membership)
):
    """
    アイテム一覧取得（フィルタリング、ページネーション対応）
    
    - **family_id**: 家族ID
    - **type**: タイプフィルタ（task/event/need）
    - **isCompleted**: 完了状態フィルタ
    - **assignedTo**: 担当者フィルタ
    - **categoryId**: カテゴリフィルタ
    - **visibility**: 公開範囲フィルタ
    - **limit**: 取得件数（デフォルト: 20、最大: 100）
    - **offset**: オフセット（デフォルト: 0）
    
    **権限**: 家族メンバー
    
    **注意**: プライベートアイテムは作成者のみ閲覧可能
    """
    try:
        result = await ItemService.get_items(
            family_id=family_id,
            current_user_uid=current_user['uid'],
            item_type=type,
            is_completed=isCompleted,
            assigned_to=assignedTo,
            category_id=categoryId,
            visibility=visibility,
            limit=limit,
            offset=offset
        )
        return {
            'success': True,
            'data': result
        }
    except Exception as e:
        logger.error(f"❌ Unexpected error in get_items: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{family_id}/items/{item_id}", response_model=Dict[str, Any])
async def get_item(
    family_id: str,
    item_id: str,
    current_user: dict = Depends(get_current_user),
    membership: dict = Depends(check_family_membership)
):
    """
    アイテム詳細取得
    
    - **family_id**: 家族ID
    - **item_id**: アイテムID
    
    **権限**: 家族メンバー（プライベートアイテムは作成者のみ）
    """
    try:
        item = await ItemService.get_item(
            item_id=item_id,
            family_id=family_id,
            current_user_uid=current_user['uid']
        )
        return {
            'success': True,
            'data': item.model_dump()
        }
    except ValueError as e:
        logger.error(f"❌ Failed to get item: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Unexpected error in get_item: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/{family_id}/items/{item_id}", response_model=Dict[str, Any])
async def update_item(
    family_id: str,
    item_id: str,
    item_data: ItemUpdateRequest,
    current_user: dict = Depends(get_current_user),
    membership: dict = Depends(check_family_membership)
):
    """
    アイテム更新
    
    - **family_id**: 家族ID
    - **item_id**: アイテムID
    - **item_data**: 更新データ
    
    **権限**: 作成者 / 担当者 / 管理者（family公開のみ）
    """
    try:
        is_admin = membership['role'] == 'admin'
        item = await ItemService.update_item(
            item_id=item_id,
            family_id=family_id,
            item_data=item_data,
            current_user_uid=current_user['uid'],
            is_admin=is_admin
        )
        return {
            'success': True,
            'data': item.model_dump()
        }
    except ValueError as e:
        logger.error(f"❌ Failed to update item: {str(e)}")
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Unexpected error in update_item: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{family_id}/items/{item_id}", status_code=204)
async def delete_item(
    family_id: str,
    item_id: str,
    current_user: dict = Depends(get_current_user),
    membership: dict = Depends(check_family_membership)
):
    """
    アイテム削除
    
    - **family_id**: 家族ID
    - **item_id**: アイテムID
    
    **権限**: 作成者 / 管理者（family公開のみ）
    """
    try:
        is_admin = membership['role'] == 'admin'
        await ItemService.delete_item(
            item_id=item_id,
            family_id=family_id,
            current_user_uid=current_user['uid'],
            is_admin=is_admin
        )
        return None  # 204 No Content
    except ValueError as e:
        logger.error(f"❌ Failed to delete item: {str(e)}")
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Unexpected error in delete_item: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/{family_id}/items/{item_id}/complete", response_model=Dict[str, Any])
async def complete_item(
    family_id: str,
    item_id: str,
    complete_data: ItemCompleteRequest,
    current_user: dict = Depends(get_current_user),
    membership: dict = Depends(check_family_membership)
):
    """
    アイテム完了
    
    - **family_id**: 家族ID
    - **item_id**: アイテムID
    - **complete_data**: 完了データ
    
    **権限**: 作成者 / 担当者 / 管理者（family公開のみ）
    """
    try:
        is_admin = membership['role'] == 'admin'
        result = await ItemService.complete_item(
            item_id=item_id,
            family_id=family_id,
            complete_data=complete_data,
            current_user_uid=current_user['uid'],
            is_admin=is_admin
        )
        return {
            'success': True,
            'data': result
        }
    except ValueError as e:
        logger.error(f"❌ Failed to complete item: {str(e)}")
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Unexpected error in complete_item: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/{family_id}/items/{item_id}/uncomplete", response_model=Dict[str, Any])
async def uncomplete_item(
    family_id: str,
    item_id: str,
    current_user: dict = Depends(get_current_user),
    membership: dict = Depends(check_family_membership)
):
    """
    アイテム未完了に戻す
    
    - **family_id**: 家族ID
    - **item_id**: アイテムID
    
    **権限**: 作成者 / 担当者 / 管理者（family公開のみ）
    """
    try:
        is_admin = membership['role'] == 'admin'
        result = await ItemService.uncomplete_item(
            item_id=item_id,
            family_id=family_id,
            current_user_uid=current_user['uid'],
            is_admin=is_admin
        )
        return {
            'success': True,
            'data': result
        }
    except ValueError as e:
        logger.error(f"❌ Failed to uncomplete item: {str(e)}")
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Unexpected error in uncomplete_item: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ========================================
# カテゴリ管理エンドポイント
# ========================================

@router.get("/{family_id}/categories", response_model=Dict[str, Any])
async def get_categories(
    family_id: str,
    current_user: dict = Depends(get_current_user),
    membership: dict = Depends(check_family_membership)
):
    """
    カテゴリ一覧取得（usageCount降順）
    
    - **family_id**: 家族ID
    
    **権限**: 家族メンバー
    """
    try:
        categories = await ItemService.get_categories(family_id=family_id)
        return {
            'success': True,
            'data': {
                'categories': [cat.model_dump() for cat in categories]
            }
        }
    except Exception as e:
        logger.error(f"❌ Unexpected error in get_categories: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/{family_id}/categories", response_model=Dict[str, Any], status_code=201)
async def create_category(
    family_id: str,
    category_data: CategoryCreateRequest,
    current_user: dict = Depends(get_current_user),
    membership: dict = Depends(check_family_membership)
):
    """
    カテゴリ作成
    
    - **family_id**: 家族ID
    - **category_data**: カテゴリデータ
    
    **権限**: 家族メンバー
    """
    try:
        category = await ItemService.create_category(
            family_id=family_id,
            category_data=category_data,
            created_by_uid=current_user['uid']
        )
        return {
            'success': True,
            'data': category.model_dump()
        }
    except ValueError as e:
        logger.error(f"❌ Failed to create category: {str(e)}")
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Unexpected error in create_category: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/{family_id}/categories/{category_id}", response_model=Dict[str, Any])
async def update_category(
    family_id: str,
    category_id: str,
    category_data: CategoryCreateRequest,
    current_user: dict = Depends(get_current_user),
    membership: dict = Depends(check_family_membership)
):
    """
    カテゴリ更新
    
    - **family_id**: 家族ID
    - **category_id**: カテゴリID
    - **category_data**: 更新データ
    
    **権限**: 管理者 / カテゴリ作成者
    
    **制約**: 
    - デフォルトカテゴリは編集不可
    - カテゴリ名は家族内でユニーク
    """
    try:
        is_admin = membership['role'] == 'admin'
        category = await ItemService.update_category(
            category_id=category_id,
            family_id=family_id,
            category_data=category_data,
            current_user_uid=current_user['uid'],
            is_admin=is_admin
        )
        return {
            'success': True,
            'data': category.model_dump()
        }
    except ValueError as e:
        logger.error(f"❌ Failed to update category: {str(e)}")
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Unexpected error in update_category: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{family_id}/categories/{category_id}", status_code=204)
async def delete_category(
    family_id: str,
    category_id: str,
    current_user: dict = Depends(get_current_user),
    membership: dict = Depends(check_family_membership)
):
    """
    カテゴリ削除
    
    - **family_id**: 家族ID
    - **category_id**: カテゴリID
    
    **権限**: 管理者 / カテゴリ作成者
    
    **制約**: 
    - デフォルトカテゴリは削除不可
    - 使用中のカテゴリ（usageCount > 0）は削除不可
    """
    try:
        is_admin = membership['role'] == 'admin'
        await ItemService.delete_category(
            category_id=category_id,
            family_id=family_id,
            current_user_uid=current_user['uid'],
            is_admin=is_admin
        )
        return None  # 204 No Content
    except ValueError as e:
        logger.error(f"❌ Failed to delete category: {str(e)}")
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Unexpected error in delete_category: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")