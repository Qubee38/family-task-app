"""
家族グループ管理サービス
"""
import string
import random
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from google.cloud import firestore
from app.config import get_firestore_client
from app.models.family import (
    FamilyCreate, FamilyResponse, FamilyUpdate, FamilyListResponse,
    FamilyMemberResponse, MemberRoleUpdate,
    InvitationCreate, InvitationResponse, InvitationAccept, InvitationAcceptResponse
)
from app.utils.logger import logger


class FamilyService:
    """家族グループ管理サービス"""
    
    def __init__(self):
        self.db = get_firestore_client()
    
    # ============================================
    # ユーティリティメソッド
    # ============================================
    
    def generate_invite_code(self) -> str:
        """
        招待コード生成（6桁英数字、ユニーク）
        """
        max_attempts = 10
        
        for _ in range(max_attempts):
            # 6桁の英数字ランダム生成
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            
            # Familiesコレクションでユニークチェック
            families_ref = self.db.collection("Families")
            existing = families_ref.where("inviteCode", "==", code).limit(1).get()
            
            if not existing:
                logger.debug(f"Generated unique invite code: {code}")
                return code
        
        # 最大試行回数を超えた場合
        raise ValueError("Failed to generate unique invite code")
    
    def _get_member_count(self, family_id: str) -> int:
        """家族のメンバー数を取得"""
        members = self.db.collection("FamilyMembers") \
            .where("familyId", "==", family_id) \
            .get()
        return len(members)
    
    # ============================================
    # 家族グループ管理
    # ============================================
    
    def create_family(self, family_data: FamilyCreate, creator_uid: str) -> FamilyResponse:
        """
        家族グループ作成
        
        Args:
            family_data: 家族グループ作成データ
            creator_uid: 作成者のUID
        
        Returns:
            FamilyResponse: 作成された家族グループ情報
        """
        try:
            # 招待コード生成
            invite_code = self.generate_invite_code()
            
            # Familiesドキュメント作成
            family_ref = self.db.collection("Families").document()
            family_id = family_ref.id
            
            now = datetime.utcnow()
            
            family_doc = {
                "familyId": family_id,
                "name": family_data.name,
                "inviteCode": invite_code,
                "createdBy": creator_uid,
                "createdAt": now,
                "updatedAt": now
            }
            
            family_ref.set(family_doc)
            logger.info(f"Family created: {family_id} by {creator_uid}")
            
            # 作成者を管理者として追加
            member_id = f"{creator_uid}_{family_id}"
            member_ref = self.db.collection("FamilyMembers").document(member_id)
            
            member_doc = {
                "familyMemberId": member_id,
                "familyId": family_id,
                "userId": creator_uid,
                "role": "admin",
                "joinedAt": now,
                "updatedAt": now
            }
            
            member_ref.set(member_doc)
            logger.info(f"Family member added: {member_id} (admin)")
            
            # ✅ デフォルトカテゴリ自動生成
            try:
                from app.services.item_service import create_default_categories_sync
                create_default_categories_sync(family_id, creator_uid)
                logger.info(f"Default categories created for family: {family_id}")
            except Exception as e:
                logger.warning(f"Failed to create default categories: {str(e)}")
                # カテゴリ作成失敗は家族作成を妨げない
            
            # レスポンス作成
            return FamilyResponse(
                familyId=family_id,
                name=family_data.name,
                inviteCode=invite_code,
                createdBy=creator_uid,
                createdAt=now,
                updatedAt=now,
                memberCount=1
            )
            
        except Exception as e:
            logger.error(f"Failed to create family: {str(e)}", exc_info=True)
            raise ValueError(f"家族グループの作成に失敗しました: {str(e)}")
    
    def get_user_families(self, user_id: str) -> List[FamilyListResponse]:
        """
        ユーザーの所属家族一覧取得
        
        Args:
            user_id: ユーザーID
        
        Returns:
            List[FamilyListResponse]: 所属家族一覧
        """
        try:
            # FamilyMembersから所属家族を取得
            members_query = self.db.collection("FamilyMembers") \
                .where("userId", "==", user_id) \
                .get()
            
            families = []
            
            for member_doc in members_query:
                member_data = member_doc.to_dict()
                family_id = member_data["familyId"]
                
                # Familiesから家族情報を取得
                family_ref = self.db.collection("Families").document(family_id)
                family_doc = family_ref.get()
                
                if not family_doc.exists:
                    logger.warning(f"Family not found: {family_id}")
                    continue
                
                family_data = family_doc.to_dict()
                member_count = self._get_member_count(family_id)
                
                families.append(FamilyListResponse(
                    familyId=family_id,
                    name=family_data["name"],
                    inviteCode=family_data["inviteCode"],
                    role=member_data["role"],
                    memberCount=member_count,
                    joinedAt=member_data["joinedAt"]
                ))
            
            logger.debug(f"Found {len(families)} families for user: {user_id}")
            return families
            
        except Exception as e:
            logger.error(f"Failed to get user families: {str(e)}", exc_info=True)
            raise ValueError(f"所属家族の取得に失敗しました: {str(e)}")
    
    def get_family_detail(self, family_id: str) -> Dict[str, Any]:
        """
        家族詳細取得
        
        Args:
            family_id: 家族ID
        
        Returns:
            Dict: 家族詳細情報（メンバー含む）
        """
        try:
            # Familiesから家族情報を取得
            family_ref = self.db.collection("Families").document(family_id)
            family_doc = family_ref.get()
            
            if not family_doc.exists:
                raise ValueError(f"Family not found: {family_id}")
            
            family_data = family_doc.to_dict()
            
            # メンバー取得
            members = self.get_family_members(family_id)
            
            return {
                "familyId": family_id,
                "name": family_data["name"],
                "inviteCode": family_data["inviteCode"],
                "createdBy": family_data["createdBy"],
                "createdAt": family_data["createdAt"],
                "updatedAt": family_data["updatedAt"],
                "memberCount": len(members),
                "members": members
            }
            
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Failed to get family detail: {str(e)}", exc_info=True)
            raise ValueError(f"家族詳細の取得に失敗しました: {str(e)}")
    
    def update_family(self, family_id: str, update_data: FamilyUpdate) -> FamilyResponse:
        """
        家族情報更新
        
        Args:
            family_id: 家族ID
            update_data: 更新データ
        
        Returns:
            FamilyResponse: 更新後の家族情報
        """
        try:
            family_ref = self.db.collection("Families").document(family_id)
            family_doc = family_ref.get()
            
            if not family_doc.exists:
                raise ValueError(f"Family not found: {family_id}")
            
            # 更新データ準備
            update_dict = {}
            if update_data.name is not None:
                update_dict["name"] = update_data.name
            
            update_dict["updatedAt"] = datetime.utcnow()
            
            # 更新実行
            family_ref.update(update_dict)
            logger.info(f"Family updated: {family_id}")
            
            # 更新後のデータ取得
            updated_doc = family_ref.get()
            updated_data = updated_doc.to_dict()
            member_count = self._get_member_count(family_id)
            
            return FamilyResponse(
                familyId=family_id,
                name=updated_data["name"],
                inviteCode=updated_data["inviteCode"],
                createdBy=updated_data["createdBy"],
                createdAt=updated_data["createdAt"],
                updatedAt=updated_data["updatedAt"],
                memberCount=member_count
            )
            
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Failed to update family: {str(e)}", exc_info=True)
            raise ValueError(f"家族情報の更新に失敗しました: {str(e)}")
    
    def delete_family(self, family_id: str):
        """
        家族削除（関連データも連鎖削除）
        
        Args:
            family_id: 家族ID
        """
        try:
            # Familiesドキュメント削除
            family_ref = self.db.collection("Families").document(family_id)
            family_ref.delete()
            
            # FamilyMembersドキュメント削除
            members = self.db.collection("FamilyMembers") \
                .where("familyId", "==", family_id) \
                .get()
            
            for member_doc in members:
                member_doc.reference.delete()
            
            # TODO: 将来的に以下も削除
            # - Items
            # - Comments
            # - Points
            # - PointRules
            # - Invitations
            
            logger.info(f"Family deleted: {family_id}")
            
        except Exception as e:
            logger.error(f"Failed to delete family: {str(e)}", exc_info=True)
            raise ValueError(f"家族の削除に失敗しました: {str(e)}")
    
    # ============================================
    # メンバー管理
    # ============================================
    
    def get_family_members(self, family_id: str) -> List[FamilyMemberResponse]:
        """
        家族メンバー一覧取得
        
        Args:
            family_id: 家族ID
        
        Returns:
            List[FamilyMemberResponse]: メンバー一覧
        """
        try:
            members_query = self.db.collection("FamilyMembers") \
                .where("familyId", "==", family_id) \
                .get()
            
            members = []
            
            for member_doc in members_query:
                member_data = member_doc.to_dict()
                user_id = member_data["userId"]
                
                # Usersからユーザー情報を取得
                user_ref = self.db.collection("Users").document(user_id)
                user_doc = user_ref.get()
                
                if not user_doc.exists:
                    logger.warning(f"User not found: {user_id}")
                    continue
                
                user_data = user_doc.to_dict()
                
                members.append(FamilyMemberResponse(
                    userId=user_id,
                    displayName=user_data.get("displayName", ""),
                    email=user_data.get("email", ""),
                    role=member_data["role"],
                    joinedAt=member_data["joinedAt"],
                    photoURL=user_data.get("photoURL")
                ))
            
            return members
            
        except Exception as e:
            logger.error(f"Failed to get family members: {str(e)}", exc_info=True)
            raise ValueError(f"メンバー一覧の取得に失敗しました: {str(e)}")
    
    def update_member_role(self, family_id: str, user_id: str, role_update: MemberRoleUpdate) -> Dict[str, Any]:
        """
        メンバー権限変更
        
        Args:
            family_id: 家族ID
            user_id: ユーザーID
            role_update: 権限更新データ
        
        Returns:
            Dict: 更新後のメンバー情報
        """
        try:
            member_id = f"{user_id}_{family_id}"
            member_ref = self.db.collection("FamilyMembers").document(member_id)
            member_doc = member_ref.get()
            
            if not member_doc.exists:
                raise ValueError(f"Member not found: {member_id}")
            
            # 最後の管理者チェック
            if role_update.role == "member":
                admin_count = len(self.db.collection("FamilyMembers")
                    .where("familyId", "==", family_id)
                    .where("role", "==", "admin")
                    .get())
                
                if admin_count <= 1:
                    raise ValueError("Cannot change role: at least one admin is required")
            
            # 権限更新
            member_ref.update({
                "role": role_update.role,
                "updatedAt": datetime.utcnow()
            })
            
            logger.info(f"Member role updated: {member_id} -> {role_update.role}")
            
            # 更新後のデータ取得
            updated_doc = member_ref.get()
            return {
                "userId": user_id,
                "role": role_update.role,
                "updatedAt": datetime.utcnow()
            }
            
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Failed to update member role: {str(e)}", exc_info=True)
            raise ValueError(f"権限変更に失敗しました: {str(e)}")
    
    def delete_member(self, family_id: str, user_id: str, requester_id: str):
        """
        メンバー削除
        
        Args:
            family_id: 家族ID
            user_id: 削除対象のユーザーID
            requester_id: 削除実行者のユーザーID
        """
        try:
            member_id = f"{user_id}_{family_id}"
            member_ref = self.db.collection("FamilyMembers").document(member_id)
            member_doc = member_ref.get()
            
            if not member_doc.exists:
                raise ValueError(f"Member not found: {member_id}")
            
            member_data = member_doc.to_dict()
            
            # 最後の管理者チェック
            if member_data["role"] == "admin":
                admin_count = len(self.db.collection("FamilyMembers")
                    .where("familyId", "==", family_id)
                    .where("role", "==", "admin")
                    .get())
                
                if admin_count <= 1:
                    raise ValueError("Cannot delete the last admin")
            
            # 削除実行
            member_ref.delete()
            logger.info(f"Member deleted: {member_id} by {requester_id}")
            
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Failed to delete member: {str(e)}", exc_info=True)
            raise ValueError(f"メンバー削除に失敗しました: {str(e)}")
    
    # ============================================
    # 招待管理
    # ============================================
    
    def create_invitation(self, family_id: str, invitation_data: InvitationCreate, inviter_id: str) -> InvitationResponse:
        """
        招待作成（メールアドレス指定）
        
        Args:
            family_id: 家族ID
            invitation_data: 招待データ
            inviter_id: 招待者のUID
        
        Returns:
            InvitationResponse: 作成された招待情報
        """
        try:
            # 既にメンバーかチェック
            from firebase_admin import auth
            try:
                user = auth.get_user_by_email(invitation_data.email)
                member_id = f"{user.uid}_{family_id}"
                member_ref = self.db.collection("FamilyMembers").document(member_id)
                
                if member_ref.get().exists:
                    raise ValueError("User is already a member of this family")
            except auth.UserNotFoundError:
                # ユーザーが存在しない場合はOK（将来登録する可能性）
                pass
            
            # 既存の有効な招待をチェック
            existing = self.db.collection("Invitations") \
                .where("familyId", "==", family_id) \
                .where("email", "==", invitation_data.email) \
                .where("status", "==", "pending") \
                .limit(1) \
                .get()
            
            if existing:
                raise ValueError("Invitation already exists for this email")
            
            # 家族情報取得（招待コード用）
            family_ref = self.db.collection("Families").document(family_id)
            family_doc = family_ref.get()
            
            if not family_doc.exists:
                raise ValueError(f"Family not found: {family_id}")
            
            family_data = family_doc.to_dict()
            
            # 招待ドキュメント作成
            invitation_ref = self.db.collection("Invitations").document()
            invitation_id = invitation_ref.id
            
            now = datetime.utcnow()
            expires_at = now + timedelta(days=7)  # 7日間有効
            
            invitation_doc = {
                "invitationId": invitation_id,
                "familyId": family_id,
                "email": invitation_data.email,
                "inviteCode": family_data["inviteCode"],
                "status": "pending",
                "invitedBy": inviter_id,
                "expiresAt": expires_at,
                "createdAt": now,
                "acceptedAt": None
            }
            
            invitation_ref.set(invitation_doc)
            logger.info(f"Invitation created: {invitation_id}")
            
            # 招待者情報取得
            inviter_ref = self.db.collection("Users").document(inviter_id)
            inviter_doc = inviter_ref.get()
            inviter_name = inviter_doc.to_dict().get("displayName") if inviter_doc.exists else None
            
            return InvitationResponse(
                invitationId=invitation_id,
                familyId=family_id,
                email=invitation_data.email,
                inviteCode=family_data["inviteCode"],
                status="pending",
                invitedBy=inviter_id,
                invitedByName=inviter_name,
                expiresAt=expires_at,
                createdAt=now,
                acceptedAt=None
            )
            
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Failed to create invitation: {str(e)}", exc_info=True)
            raise ValueError(f"招待の作成に失敗しました: {str(e)}")
    
    def get_family_invitations(self, family_id: str, status: Optional[str] = None) -> List[InvitationResponse]:
        """
        家族の招待一覧取得
        
        Args:
            family_id: 家族ID
            status: ステータスフィルター（pending/accepted/expired）
        
        Returns:
            List[InvitationResponse]: 招待一覧
        """
        try:
            query = self.db.collection("Invitations").where("familyId", "==", family_id)
            
            if status:
                query = query.where("status", "==", status)
            
            invitations_query = query.get()
            invitations = []
            
            for inv_doc in invitations_query:
                inv_data = inv_doc.to_dict()
                
                # 招待者情報取得
                inviter_ref = self.db.collection("Users").document(inv_data["invitedBy"])
                inviter_doc = inviter_ref.get()
                inviter_name = inviter_doc.to_dict().get("displayName") if inviter_doc.exists else None
                
                invitations.append(InvitationResponse(
                    invitationId=inv_data["invitationId"],
                    familyId=inv_data["familyId"],
                    email=inv_data["email"],
                    inviteCode=inv_data["inviteCode"],
                    status=inv_data["status"],
                    invitedBy=inv_data["invitedBy"],
                    invitedByName=inviter_name,
                    expiresAt=inv_data["expiresAt"],
                    createdAt=inv_data["createdAt"],
                    acceptedAt=inv_data.get("acceptedAt")
                ))
            
            return invitations
            
        except Exception as e:
            logger.error(f"Failed to get invitations: {str(e)}", exc_info=True)
            raise ValueError(f"招待一覧の取得に失敗しました: {str(e)}")
    
    def accept_invitation(self, accept_data: InvitationAccept, user_id: str, user_email: str) -> InvitationAcceptResponse:
        """
        招待承認（招待コード入力）
        
        Args:
            accept_data: 招待コード
            user_id: ユーザーID
            user_email: ユーザーのメールアドレス
        
        Returns:
            InvitationAcceptResponse: 参加結果
        """
        try:
            # 招待コードで家族検索
            families = self.db.collection("Families") \
                .where("inviteCode", "==", accept_data.inviteCode) \
                .limit(1) \
                .get()
            
            if not families:
                raise ValueError("Invalid invite code")
            
            family_doc = families[0]
            family_data = family_doc.to_dict()
            family_id = family_data["familyId"]
            
            # 既にメンバーかチェック
            member_id = f"{user_id}_{family_id}"
            member_ref = self.db.collection("FamilyMembers").document(member_id)
            
            if member_ref.get().exists:
                raise ValueError("You are already a member of this family")
            
            # 招待レコード検索（オプション: メールアドレス一致確認）
            invitations = self.db.collection("Invitations") \
                .where("familyId", "==", family_id) \
                .where("email", "==", user_email) \
                .where("status", "==", "pending") \
                .limit(1) \
                .get()
            
            invitation_doc = None
            if invitations:
                invitation_doc = invitations[0]
                inv_data = invitation_doc.to_dict()
                
                # 有効期限チェック
                # Firestoreのタイムスタンプをdatetimeに変換
                expires_at = inv_data["expiresAt"]
                if hasattr(expires_at, 'timestamp'):
                    # Firestoreのタイムスタンプオブジェクトの場合
                    expires_at_dt = expires_at
                else:
                    # すでにdatetimeの場合
                    expires_at_dt = expires_at
                
                # タイムゾーンを削除して比較（naive datetime同士）
                now_naive = datetime.utcnow()
                expires_naive = expires_at_dt.replace(tzinfo=None) if hasattr(expires_at_dt, 'tzinfo') and expires_at_dt.tzinfo else expires_at_dt
                
                if expires_naive < now_naive:
                    invitation_doc.reference.update({"status": "expired"})
                    raise ValueError("Invitation has expired")
            
            # FamilyMembersに追加
            now = datetime.utcnow()
            member_doc = {
                "familyMemberId": member_id,
                "familyId": family_id,
                "userId": user_id,
                "role": "member",  # 招待参加者は一般メンバー
                "joinedAt": now,
                "updatedAt": now
            }
            
            member_ref.set(member_doc)
            logger.info(f"User joined family: {user_id} -> {family_id}")
            
            # 招待レコードを承認済みに更新
            if invitation_doc:
                invitation_doc.reference.update({
                    "status": "accepted",
                    "acceptedAt": now
                })
            
            return InvitationAcceptResponse(
                familyId=family_id,
                familyName=family_data["name"],
                role="member",
                joinedAt=now
            )
            
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Failed to accept invitation: {str(e)}", exc_info=True)
            raise ValueError(f"招待の承認に失敗しました: {str(e)}")
    
    def delete_invitation(self, invitation_id: str):
        """
        招待削除
        
        Args:
            invitation_id: 招待ID
        """
        try:
            invitation_ref = self.db.collection("Invitations").document(invitation_id)
            invitation_doc = invitation_ref.get()
            
            if not invitation_doc.exists:
                raise ValueError(f"Invitation not found: {invitation_id}")
            
            invitation_ref.delete()
            logger.info(f"Invitation deleted: {invitation_id}")
            
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Failed to delete invitation: {str(e)}", exc_info=True)
            raise ValueError(f"招待の削除に失敗しました: {str(e)}")