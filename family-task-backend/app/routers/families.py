"""
家族グループ管理API
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional
from app.models.family import (
    FamilyCreate, FamilyResponse, FamilyUpdate, FamilyListResponse,
    FamilyMemberResponse, MemberRoleUpdate,
    InvitationCreate, InvitationResponse, InvitationAccept, InvitationAcceptResponse
)
from app.services.family_service import FamilyService
from app.dependencies import get_current_user, check_family_membership, check_admin_role
from app.utils.logger import logger

router = APIRouter()


def get_family_service() -> FamilyService:
    """FamilyServiceインスタンス取得"""
    return FamilyService()


# ============================================
# 家族グループ管理
# ============================================

@router.post("", response_model=FamilyResponse, status_code=status.HTTP_201_CREATED)
async def create_family(
    family_data: FamilyCreate,
    current_user: dict = Depends(get_current_user),
    family_service: FamilyService = Depends(get_family_service)
):
    """
    家族グループ作成
    
    - 家族グループ名を指定して新規作成
    - 作成者は自動的に管理者（admin）になる
    - 6桁の招待コードが自動生成される
    """
    try:
        logger.info(f"Creating family: {family_data.name} by {current_user['uid']}")
        result = family_service.create_family(family_data, current_user["uid"])
        logger.info(f"Family created successfully: {result.familyId}")
        return result
        
    except ValueError as e:
        logger.warning(f"Family creation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Family creation error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"家族グループの作成に失敗しました: {str(e)}"
        )


@router.get("", response_model=List[FamilyListResponse])
async def get_user_families(
    current_user: dict = Depends(get_current_user),
    family_service: FamilyService = Depends(get_family_service)
):
    """
    所属家族一覧取得
    
    - ログインユーザーが所属する全ての家族グループを取得
    - 各家族での権限（admin/member）も含まれる
    """
    try:
        logger.info(f"Getting families for user: {current_user['uid']}")
        families = family_service.get_user_families(current_user["uid"])
        logger.debug(f"Found {len(families)} families")
        return families
        
    except ValueError as e:
        logger.warning(f"Failed to get families: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Get families error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"家族一覧の取得に失敗しました: {str(e)}"
        )


@router.get("/{family_id}", response_model=dict)
async def get_family_detail(
    family_id: str,
    current_user: dict = Depends(get_current_user),
    member: dict = Depends(check_family_membership),
    family_service: FamilyService = Depends(get_family_service)
):
    """
    家族詳細取得
    
    - 家族グループの詳細情報を取得
    - メンバー一覧も含む
    - 家族メンバーのみアクセス可能
    """
    try:
        logger.info(f"Getting family detail: {family_id}")
        detail = family_service.get_family_detail(family_id)
        return detail
        
    except ValueError as e:
        logger.warning(f"Family not found: {family_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Get family detail error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"家族詳細の取得に失敗しました: {str(e)}"
        )


@router.put("/{family_id}", response_model=FamilyResponse)
async def update_family(
    family_id: str,
    update_data: FamilyUpdate,
    current_user: dict = Depends(get_current_user),
    admin: dict = Depends(check_admin_role),
    family_service: FamilyService = Depends(get_family_service)
):
    """
    家族情報更新
    
    - 家族グループ名を変更
    - 管理者のみ実行可能
    """
    try:
        logger.info(f"Updating family: {family_id} by {current_user['uid']}")
        result = family_service.update_family(family_id, update_data)
        logger.info(f"Family updated successfully: {family_id}")
        return result
        
    except ValueError as e:
        logger.warning(f"Family update failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Family update error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"家族情報の更新に失敗しました: {str(e)}"
        )


@router.delete("/{family_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_family(
    family_id: str,
    current_user: dict = Depends(get_current_user),
    admin: dict = Depends(check_admin_role),
    family_service: FamilyService = Depends(get_family_service)
):
    """
    家族削除
    
    - 家族グループを削除（メンバー情報も削除）
    - 管理者のみ実行可能
    """
    try:
        logger.info(f"Deleting family: {family_id} by {current_user['uid']}")
        family_service.delete_family(family_id)
        logger.info(f"Family deleted successfully: {family_id}")
        
    except ValueError as e:
        logger.warning(f"Family deletion failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Family deletion error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"家族の削除に失敗しました: {str(e)}"
        )


# ============================================
# メンバー管理
# ============================================

@router.get("/{family_id}/members", response_model=List[FamilyMemberResponse])
async def get_family_members(
    family_id: str,
    current_user: dict = Depends(get_current_user),
    member: dict = Depends(check_family_membership),
    family_service: FamilyService = Depends(get_family_service)
):
    """
    メンバー一覧取得
    
    - 家族グループのメンバー一覧を取得
    - 家族メンバーのみアクセス可能
    """
    try:
        logger.info(f"Getting members for family: {family_id}")
        members = family_service.get_family_members(family_id)
        logger.debug(f"Found {len(members)} members")
        return members
        
    except ValueError as e:
        logger.warning(f"Failed to get members: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Get members error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"メンバー一覧の取得に失敗しました: {str(e)}"
        )


@router.put("/{family_id}/members/{user_id}", response_model=dict)
async def update_member_role(
    family_id: str,
    user_id: str,
    role_update: MemberRoleUpdate,
    current_user: dict = Depends(get_current_user),
    admin: dict = Depends(check_admin_role),
    family_service: FamilyService = Depends(get_family_service)
):
    """
    メンバー権限変更
    
    - メンバーの権限を変更（admin ⇔ member）
    - 管理者のみ実行可能
    - 最後の管理者は一般メンバーに変更不可
    """
    try:
        logger.info(f"Updating member role: {user_id} in {family_id} to {role_update.role}")
        result = family_service.update_member_role(family_id, user_id, role_update)
        logger.info(f"Member role updated successfully")
        return result
        
    except ValueError as e:
        logger.warning(f"Member role update failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Member role update error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"権限変更に失敗しました: {str(e)}"
        )


@router.delete("/{family_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_member(
    family_id: str,
    user_id: str,
    current_user: dict = Depends(get_current_user),
    admin: dict = Depends(check_admin_role),
    family_service: FamilyService = Depends(get_family_service)
):
    """
    メンバー削除
    
    - 家族グループからメンバーを削除
    - 管理者のみ実行可能
    - 最後の管理者は削除不可
    - 自分自身も削除可能（退出）
    """
    try:
        logger.info(f"Deleting member: {user_id} from {family_id} by {current_user['uid']}")
        family_service.delete_member(family_id, user_id, current_user["uid"])
        logger.info(f"Member deleted successfully")
        
    except ValueError as e:
        logger.warning(f"Member deletion failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Member deletion error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"メンバー削除に失敗しました: {str(e)}"
        )


# ============================================
# 招待管理
# ============================================

@router.post("/{family_id}/invitations", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
async def create_invitation(
    family_id: str,
    invitation_data: InvitationCreate,
    current_user: dict = Depends(get_current_user),
    member: dict = Depends(check_family_membership),
    family_service: FamilyService = Depends(get_family_service)
):
    """
    招待作成（メールアドレス指定）
    
    - メールアドレスを指定して招待を作成
    - 招待コードは家族グループの招待コードと同じ
    - 有効期限は7日間
    - 家族メンバーなら誰でも招待可能
    """
    try:
        logger.info(f"Creating invitation for {invitation_data.email} to family {family_id}")
        result = family_service.create_invitation(family_id, invitation_data, current_user["uid"])
        logger.info(f"Invitation created: {result.invitationId}")
        return result
        
    except ValueError as e:
        logger.warning(f"Invitation creation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Invitation creation error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"招待の作成に失敗しました: {str(e)}"
        )


@router.get("/{family_id}/invitations", response_model=List[InvitationResponse])
async def get_family_invitations(
    family_id: str,
    status_filter: Optional[str] = Query(None, alias="status", description="ステータスフィルター (pending/accepted/expired)"),
    current_user: dict = Depends(get_current_user),
    member: dict = Depends(check_family_membership),
    family_service: FamilyService = Depends(get_family_service)
):
    """
    招待一覧取得
    
    - 家族グループの招待一覧を取得
    - ステータスでフィルタリング可能（pending/accepted/expired）
    - 家族メンバーのみアクセス可能
    """
    try:
        logger.info(f"Getting invitations for family: {family_id}")
        invitations = family_service.get_family_invitations(family_id, status_filter)
        logger.debug(f"Found {len(invitations)} invitations")
        return invitations
        
    except ValueError as e:
        logger.warning(f"Failed to get invitations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Get invitations error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"招待一覧の取得に失敗しました: {str(e)}"
        )


@router.post("/invitations/accept", response_model=InvitationAcceptResponse)
async def accept_invitation(
    accept_data: InvitationAccept,
    current_user: dict = Depends(get_current_user),
    family_service: FamilyService = Depends(get_family_service)
):
    """
    招待承認（招待コード入力）
    
    - 6桁の招待コードを入力して家族グループに参加
    - 招待レコードがない場合でも、招待コードが正しければ参加可能
    - 参加後は一般メンバー（member）権限
    """
    try:
        logger.info(f"Accepting invitation with code: {accept_data.inviteCode} by {current_user['uid']}")
        result = family_service.accept_invitation(
            accept_data, 
            current_user["uid"],
            current_user["email"]
        )
        logger.info(f"Invitation accepted: {result.familyId}")
        return result
        
    except ValueError as e:
        logger.warning(f"Invitation acceptance failed: {str(e)}")
        
        # エラーメッセージに応じて適切なステータスコードを返す
        if "Invalid invite code" in str(e):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        elif "already a member" in str(e):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=str(e)
            )
        elif "expired" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
    except Exception as e:
        logger.error(f"Invitation acceptance error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"招待の承認に失敗しました: {str(e)}"
        )


@router.delete("/invitations/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invitation(
    invitation_id: str,
    current_user: dict = Depends(get_current_user),
    family_service: FamilyService = Depends(get_family_service)
):
    """
    招待削除
    
    - 招待を削除
    - 管理者のみ実行可能（家族IDベースのチェックは省略）
    """
    try:
        logger.info(f"Deleting invitation: {invitation_id} by {current_user['uid']}")
        family_service.delete_invitation(invitation_id)
        logger.info(f"Invitation deleted successfully")
        
    except ValueError as e:
        logger.warning(f"Invitation deletion failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Invitation deletion error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"招待の削除に失敗しました: {str(e)}"
        )