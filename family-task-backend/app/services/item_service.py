"""
アイテム（タスク/予定/必要物）管理サービス
"""
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from google.cloud.firestore_v1 import FieldFilter
from app.config import get_firestore_client
from app.utils.logger import logger
from app.models.item import (
    ItemCreateRequest,
    ItemUpdateRequest,
    ItemCompleteRequest,
    ItemResponse,
    CategoryCreateRequest,
    CategoryResponse
)

# Firestoreクライアント取得
db = get_firestore_client()


class ItemService:
    """アイテム管理サービス"""

    # ========================================
    # アイテムCRUD
    # ========================================

    @staticmethod
    async def create_item(
        family_id: str,
        item_data: ItemCreateRequest,
        created_by_uid: str
    ) -> ItemResponse:
        """
        アイテム作成
        
        Args:
            family_id: 家族ID
            item_data: アイテムデータ
            created_by_uid: 作成者UID
            
        Returns:
            ItemResponse: 作成されたアイテム
            
        Raises:
            ValueError: カテゴリが存在しない、eventでstartDateTimeがない場合
        """
        logger.info(f"🔹 Creating item: type={item_data.type}, title={item_data.title}")

        db = get_firestore_client()

        # カテゴリの存在確認
        category_ref = db.collection('Categories').document(item_data.categoryId)
        category = category_ref.get()
        if not category.exists:
            raise ValueError(f"Category not found: {item_data.categoryId}")

        # eventタイプの場合、startDateTimeが必須
        if item_data.type == 'event' and not item_data.startDateTime:
            raise ValueError("startDateTime is required for event type")

        # Itemsドキュメント作成
        now = datetime.now(timezone.utc)
        item_ref = db.collection('Items').document()
        
        item_dict = {
            'itemId': item_ref.id,
            'familyId': family_id,
            'type': item_data.type,
            'title': item_data.title,
            'categoryId': item_data.categoryId,
            'assignedTo': item_data.assignedTo,
            'priority': item_data.priority,
            'location': item_data.location,
            'visibility': item_data.visibility,
            'isCompleted': False,
            'completedAt': None,
            'completedBy': None,
            'startDateTime': item_data.startDateTime,
            'endDateTime': item_data.endDateTime,
            'recurrence': item_data.recurrence.model_dump() if item_data.recurrence else None,
            'createdBy': created_by_uid,
            'createdAt': now,
            'updatedAt': now
        }

        item_ref.set(item_dict)

        # カテゴリのusageCountを+1
        category_ref.update({'usageCount': category.to_dict().get('usageCount', 0) + 1})

        logger.info(f"✅ Item created: itemId={item_ref.id}")

        # レスポンス作成（結合情報を含む）
        return await ItemService._build_item_response(item_ref.id, family_id)

    @staticmethod
    async def get_items(
        family_id: str,
        current_user_uid: str,
        item_type: Optional[str] = None,
        is_completed: Optional[bool] = None,
        assigned_to: Optional[str] = None,
        category_id: Optional[str] = None,
        visibility: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        アイテム一覧取得（フィルタリング、ページネーション対応）
        
        Args:
            family_id: 家族ID
            current_user_uid: 現在のユーザーUID
            item_type: タイプフィルタ（task/event/need）
            is_completed: 完了状態フィルタ
            assigned_to: 担当者フィルタ
            category_id: カテゴリフィルタ
            visibility: 公開範囲フィルタ
            limit: 取得件数
            offset: オフセット
            
        Returns:
            Dict: アイテム一覧とメタ情報
        """
        logger.info(f"🔹 Getting items: familyId={family_id}, type={item_type}")

        # ベースクエリ: familyId でフィルタ
        query = db.collection('Items').where(filter=FieldFilter('familyId', '==', family_id))

        # プライベートアイテムのフィルタリング
        # family公開 OR 自分が作成したprivate
        # NOTE: Firestoreの制約上、OR条件は複雑なので、取得後にフィルタリング
        
        # typeフィルタ
        if item_type:
            query = query.where(filter=FieldFilter('type', '==', item_type))

        # 完了状態フィルタ
        if is_completed is not None:
            query = query.where(filter=FieldFilter('isCompleted', '==', is_completed))

        # 担当者フィルタ
        if assigned_to:
            query = query.where(filter=FieldFilter('assignedTo', '==', assigned_to))

        # カテゴリフィルタ
        if category_id:
            query = query.where(filter=FieldFilter('categoryId', '==', category_id))

        # ソート: endDateTime昇順（期限が近い順）
        query = query.order_by('endDateTime')

        # 全件取得（プライベートフィルタリングのため）
        all_items = query.stream()

        # プライベートアイテムのフィルタリング
        filtered_items = []
        for doc in all_items:
            item_data = doc.to_dict()
            # family公開 OR 自分が作成
            if item_data.get('visibility') == 'family' or item_data.get('createdBy') == current_user_uid:
                # visibilityフィルタがある場合
                if visibility and item_data.get('visibility') != visibility:
                    continue
                filtered_items.append(item_data)

        # ページネーション
        total = len(filtered_items)
        paginated_items = filtered_items[offset:offset + limit]

        # レスポンス作成（結合情報を含む）
        items_with_details = []
        for item_data in paginated_items:
            item_response = await ItemService._build_item_response_from_dict(item_data)
            items_with_details.append(item_response.model_dump())

        logger.info(f"✅ Retrieved {len(items_with_details)} items (total: {total})")

        return {
            'items': items_with_details,
            'total': total,
            'limit': limit,
            'offset': offset
        }

    @staticmethod
    async def get_item(
        item_id: str,
        family_id: str,
        current_user_uid: str
    ) -> ItemResponse:
        """
        アイテム詳細取得
        
        Args:
            item_id: アイテムID
            family_id: 家族ID
            current_user_uid: 現在のユーザーUID
            
        Returns:
            ItemResponse: アイテム詳細
            
        Raises:
            ValueError: アイテムが存在しない、権限がない場合
        """
        logger.info(f"🔹 Getting item: itemId={item_id}")

        item_ref = db.collection('Items').document(item_id)
        item_doc = item_ref.get()

        if not item_doc.exists:
            raise ValueError(f"Item not found: {item_id}")

        item_data = item_doc.to_dict()

        # 家族IDチェック
        if item_data.get('familyId') != family_id:
            raise ValueError(f"Item does not belong to family: {family_id}")

        # プライベートアイテムのアクセス制御
        if item_data.get('visibility') == 'private' and item_data.get('createdBy') != current_user_uid:
            raise ValueError(f"No permission to view private item: {item_id}")

        logger.info(f"✅ Item retrieved: {item_id}")

        return await ItemService._build_item_response_from_dict(item_data)

    @staticmethod
    async def update_item(
        item_id: str,
        family_id: str,
        item_data: ItemUpdateRequest,
        current_user_uid: str,
        is_admin: bool
    ) -> ItemResponse:
        """
        アイテム更新
        
        Args:
            item_id: アイテムID
            family_id: 家族ID
            item_data: 更新データ
            current_user_uid: 現在のユーザーUID
            is_admin: 管理者フラグ
            
        Returns:
            ItemResponse: 更新されたアイテム
            
        Raises:
            ValueError: アイテムが存在しない、権限がない場合
        """
        logger.info(f"🔹 Updating item: itemId={item_id}")

        item_ref = db.collection('Items').document(item_id)
        item_doc = item_ref.get()

        if not item_doc.exists:
            raise ValueError(f"Item not found: {item_id}")

        existing_data = item_doc.to_dict()

        # 家族IDチェック
        if existing_data.get('familyId') != family_id:
            raise ValueError(f"Item does not belong to family: {family_id}")

        # 権限チェック: 作成者 OR 担当者 OR 管理者（family公開のみ）
        created_by = existing_data.get('createdBy')
        assigned_to = existing_data.get('assignedTo')
        visibility = existing_data.get('visibility')

        has_permission = (
            created_by == current_user_uid or
            assigned_to == current_user_uid or
            (is_admin and visibility == 'family')
        )

        if not has_permission:
            raise ValueError(f"No permission to edit item: {item_id}")

        # 更新データ作成
        update_dict = {'updatedAt': datetime.now(timezone.utc)}
        
        if item_data.title is not None:
            update_dict['title'] = item_data.title
        if item_data.categoryId is not None:
            # カテゴリ存在確認
            category_ref = db.collection('Categories').document(item_data.categoryId)
            if not category_ref.get().exists:
                raise ValueError(f"Category not found: {item_data.categoryId}")
            update_dict['categoryId'] = item_data.categoryId
        if item_data.assignedTo is not None:
            update_dict['assignedTo'] = item_data.assignedTo
        if item_data.priority is not None:
            update_dict['priority'] = item_data.priority
        if item_data.location is not None:
            update_dict['location'] = item_data.location
        if item_data.visibility is not None:
            update_dict['visibility'] = item_data.visibility
        if item_data.startDateTime is not None:
            update_dict['startDateTime'] = item_data.startDateTime
        if item_data.endDateTime is not None:
            update_dict['endDateTime'] = item_data.endDateTime
        if item_data.recurrence is not None:
            update_dict['recurrence'] = item_data.recurrence.model_dump() if item_data.recurrence else None

        item_ref.update(update_dict)

        logger.info(f"✅ Item updated: {item_id}")

        return await ItemService._build_item_response(item_id, family_id)

    @staticmethod
    async def delete_item(
        item_id: str,
        family_id: str,
        current_user_uid: str,
        is_admin: bool
    ) -> None:
        """
        アイテム削除
        
        Args:
            item_id: アイテムID
            family_id: 家族ID
            current_user_uid: 現在のユーザーUID
            is_admin: 管理者フラグ
            
        Raises:
            ValueError: アイテムが存在しない、権限がない場合
        """
        logger.info(f"🔹 Deleting item: itemId={item_id}")

        item_ref = db.collection('Items').document(item_id)
        item_doc = item_ref.get()

        if not item_doc.exists:
            raise ValueError(f"Item not found: {item_id}")

        item_data = item_doc.to_dict()

        # 家族IDチェック
        if item_data.get('familyId') != family_id:
            raise ValueError(f"Item does not belong to family: {family_id}")

        # 権限チェック: 作成者 OR 管理者（family公開のみ）
        created_by = item_data.get('createdBy')
        visibility = item_data.get('visibility')

        has_permission = (
            created_by == current_user_uid or
            (is_admin and visibility == 'family')
        )

        if not has_permission:
            raise ValueError(f"No permission to delete item: {item_id}")

        # アイテム削除
        item_ref.delete()

        # TODO: Phase 7で実装 - 関連コメント削除

        logger.info(f"✅ Item deleted: {item_id}")

    @staticmethod
    async def complete_item(
        item_id: str,
        family_id: str,
        complete_data: ItemCompleteRequest,
        current_user_uid: str,
        is_admin: bool
    ) -> Dict[str, Any]:
        """
        アイテム完了
        
        Args:
            item_id: アイテムID
            family_id: 家族ID
            complete_data: 完了データ
            current_user_uid: 現在のユーザーUID
            is_admin: 管理者フラグ
            
        Returns:
            Dict: 完了情報とポイント
            
        Raises:
            ValueError: アイテムが存在しない、権限がない場合
        """
        logger.info(f"🔹 Completing item: itemId={item_id}")

        item_ref = db.collection('Items').document(item_id)
        item_doc = item_ref.get()

        if not item_doc.exists:
            raise ValueError(f"Item not found: {item_id}")

        item_data = item_doc.to_dict()

        # 家族IDチェック
        if item_data.get('familyId') != family_id:
            raise ValueError(f"Item does not belong to family: {family_id}")

        # 権限チェック: 作成者 OR 担当者 OR 管理者（family公開のみ）
        created_by = item_data.get('createdBy')
        assigned_to = item_data.get('assignedTo')
        visibility = item_data.get('visibility')

        has_permission = (
            created_by == current_user_uid or
            assigned_to == current_user_uid or
            (is_admin and visibility == 'family')
        )

        if not has_permission:
            raise ValueError(f"No permission to complete item: {item_id}")

        # 完了状態に更新
        now = datetime.now(timezone.utc)
        item_ref.update({
            'isCompleted': True,
            'completedAt': now,
            'completedBy': complete_data.completedBy,
            'updatedAt': now
        })

        # TODO: Phase 8で実装 - ポイント計算・付与

        logger.info(f"✅ Item completed: {item_id}")

        return {
            'itemId': item_id,
            'isCompleted': True,
            'completedAt': now.isoformat(),
            'completedBy': complete_data.completedBy,
            'pointsEarned': 0  # TODO: Phase 8で実装
        }

    @staticmethod
    async def uncomplete_item(
        item_id: str,
        family_id: str,
        current_user_uid: str,
        is_admin: bool
    ) -> Dict[str, Any]:
        """
        アイテム未完了に戻す
        
        Args:
            item_id: アイテムID
            family_id: 家族ID
            current_user_uid: 現在のユーザーUID
            is_admin: 管理者フラグ
            
        Returns:
            Dict: 未完了情報
            
        Raises:
            ValueError: アイテムが存在しない、権限がない場合
        """
        logger.info(f"🔹 Uncompleting item: itemId={item_id}")

        item_ref = db.collection('Items').document(item_id)
        item_doc = item_ref.get()

        if not item_doc.exists:
            raise ValueError(f"Item not found: {item_id}")

        item_data = item_doc.to_dict()

        # 家族IDチェック
        if item_data.get('familyId') != family_id:
            raise ValueError(f"Item does not belong to family: {family_id}")

        # 権限チェック: 作成者 OR 担当者 OR 管理者（family公開のみ）
        created_by = item_data.get('createdBy')
        assigned_to = item_data.get('assignedTo')
        visibility = item_data.get('visibility')

        has_permission = (
            created_by == current_user_uid or
            assigned_to == current_user_uid or
            (is_admin and visibility == 'family')
        )

        if not has_permission:
            raise ValueError(f"No permission to uncomplete item: {item_id}")

        # 未完了状態に更新
        item_ref.update({
            'isCompleted': False,
            'completedAt': None,
            'completedBy': None,
            'updatedAt': datetime.now(timezone.utc)
        })

        # TODO: Phase 8で実装 - ポイント取り消し

        logger.info(f"✅ Item uncompleted: {item_id}")

        return {
            'itemId': item_id,
            'isCompleted': False,
            'completedAt': None,
            'completedBy': None
        }

    # ========================================
    # カテゴリ管理
    # ========================================

    @staticmethod
    async def get_categories(family_id: str) -> List[CategoryResponse]:
        """
        カテゴリ一覧取得（usageCount降順）
        
        Args:
            family_id: 家族ID
            
        Returns:
            List[CategoryResponse]: カテゴリ一覧
        """
        logger.info(f"🔹 Getting categories: familyId={family_id}")

        categories = db.collection('Categories') \
            .where(filter=FieldFilter('familyId', '==', family_id)) \
            .order_by('usageCount', direction='DESCENDING') \
            .stream()

        category_list = []
        for doc in categories:
            data = doc.to_dict()
            category_list.append(CategoryResponse(
                categoryId=doc.id,
                familyId=data['familyId'],
                name=data['name'],
                suggestedFor=data.get('suggestedFor', []),
                isDefault=data.get('isDefault', False),
                usageCount=data.get('usageCount', 0),
                points=data.get('points'),
                createdBy=data['createdBy'],
                createdAt=data['createdAt'],
                updatedAt=data['updatedAt']
            ))

        logger.info(f"✅ Retrieved {len(category_list)} categories")

        return category_list

    @staticmethod
    async def create_category(
        family_id: str,
        category_data: CategoryCreateRequest,
        created_by_uid: str
    ) -> CategoryResponse:
        """
        カテゴリ作成
        
        Args:
            family_id: 家族ID
            category_data: カテゴリデータ
            created_by_uid: 作成者UID
            
        Returns:
            CategoryResponse: 作成されたカテゴリ
            
        Raises:
            ValueError: カテゴリ名が重複している場合
        """
        logger.info(f"🔹 Creating category: name={category_data.name}")

        # カテゴリ名の重複チェック（家族内）
        existing = db.collection('Categories') \
            .where(filter=FieldFilter('familyId', '==', family_id)) \
            .where(filter=FieldFilter('name', '==', category_data.name)) \
            .get()

        if existing:
            raise ValueError(f"Category name already exists: {category_data.name}")

        # Categoriesドキュメント作成
        now = datetime.now(timezone.utc)
        category_ref = db.collection('Categories').document()

        category_dict = {
            'categoryId': category_ref.id,
            'familyId': family_id,
            'name': category_data.name,
            'suggestedFor': category_data.suggestedFor,
            'isDefault': False,
            'usageCount': 0,
            'points': category_data.points,
            'createdBy': created_by_uid,
            'createdAt': now,
            'updatedAt': now
        }

        category_ref.set(category_dict)

        # TODO: Phase 8で実装 - PointRulesドキュメント作成

        logger.info(f"✅ Category created: categoryId={category_ref.id}")

        return CategoryResponse(**category_dict)

    @staticmethod
    async def update_category(
        category_id: str,
        family_id: str,
        category_data: CategoryCreateRequest,
        current_user_uid: str,
        is_admin: bool
    ) -> CategoryResponse:
        """
        カテゴリ更新
        
        Args:
            category_id: カテゴリID
            family_id: 家族ID
            category_data: 更新データ
            current_user_uid: 現在のユーザーUID
            is_admin: 管理者フラグ
            
        Returns:
            CategoryResponse: 更新されたカテゴリ
            
        Raises:
            ValueError: カテゴリが存在しない、権限がない、デフォルトカテゴリ、名前重複
        """
        logger.info(f"🔹 Updating category: categoryId={category_id}")

        category_ref = db.collection('Categories').document(category_id)
        category_doc = category_ref.get()

        if not category_doc.exists:
            raise ValueError(f"Category not found: {category_id}")

        category = category_doc.to_dict()

        # 家族IDチェック
        if category.get('familyId') != family_id:
            raise ValueError(f"Category does not belong to family: {family_id}")

        # デフォルトカテゴリは編集不可
        if category.get('isDefault'):
            raise ValueError("Cannot update default category")

        # 権限チェック: 管理者 OR 作成者
        if not is_admin and category.get('createdBy') != current_user_uid:
            raise ValueError(f"No permission to update category: {category_id}")

        # カテゴリ名の重複チェック（家族内、自分以外）
        if category_data.name != category.get('name'):
            existing = db.collection('Categories') \
                .where(filter=FieldFilter('familyId', '==', family_id)) \
                .where(filter=FieldFilter('name', '==', category_data.name)) \
                .get()

            if existing:
                raise ValueError(f"Category name already exists: {category_data.name}")

        # 更新
        update_dict = {
            'name': category_data.name,
            'suggestedFor': category_data.suggestedFor,
            'points': category_data.points,
            'updatedAt': datetime.now(timezone.utc)
        }

        category_ref.update(update_dict)

        logger.info(f"✅ Category updated: {category_id}")

        # 更新後のデータ取得
        updated_doc = category_ref.get()
        updated_data = updated_doc.to_dict()

        return CategoryResponse(
            categoryId=updated_data['categoryId'],
            familyId=updated_data['familyId'],
            name=updated_data['name'],
            suggestedFor=updated_data.get('suggestedFor', []),
            isDefault=updated_data.get('isDefault', False),
            usageCount=updated_data.get('usageCount', 0),
            points=updated_data.get('points'),
            createdBy=updated_data['createdBy'],
            createdAt=updated_data['createdAt'],
            updatedAt=updated_data['updatedAt']
        )

    @staticmethod
    async def delete_category(
        category_id: str,
        family_id: str,
        current_user_uid: str,
        is_admin: bool
    ) -> None:
        """
        カテゴリ削除
        
        Args:
            category_id: カテゴリID
            family_id: 家族ID
            current_user_uid: 現在のユーザーUID
            is_admin: 管理者フラグ
            
        Raises:
            ValueError: カテゴリが存在しない、権限がない、デフォルトカテゴリ、使用中
        """
        logger.info(f"🔹 Deleting category: categoryId={category_id}")

        category_ref = db.collection('Categories').document(category_id)
        category_doc = category_ref.get()

        if not category_doc.exists:
            raise ValueError(f"Category not found: {category_id}")

        category = category_doc.to_dict()

        # 家族IDチェック
        if category.get('familyId') != family_id:
            raise ValueError(f"Category does not belong to family: {family_id}")

        # デフォルトカテゴリは削除不可
        if category.get('isDefault'):
            raise ValueError("Cannot delete default category")

        # 使用中のカテゴリは削除不可
        if category.get('usageCount', 0) > 0:
            raise ValueError("Cannot delete category that is in use")

        # 権限チェック: 管理者 OR 作成者
        if not is_admin and category.get('createdBy') != current_user_uid:
            raise ValueError(f"No permission to delete category: {category_id}")

        # 削除
        category_ref.delete()

        # TODO: Phase 8で実装 - PointRulesドキュメント削除

        logger.info(f"✅ Category deleted: {category_id}")

    # ========================================
    # ヘルパーメソッド
    # ========================================

    @staticmethod
    async def _build_item_response(item_id: str, family_id: str) -> ItemResponse:
        """アイテムレスポンス作成（結合情報を含む）"""
        item_ref = db.collection('Items').document(item_id)
        item_doc = item_ref.get()
        
        if not item_doc.exists:
            raise ValueError(f"Item not found: {item_id}")
        
        item_data = item_doc.to_dict()
        return await ItemService._build_item_response_from_dict(item_data)

    @staticmethod
    async def _build_item_response_from_dict(item_data: Dict) -> ItemResponse:
        """アイテムレスポンス作成（辞書から）"""
        # カテゴリ名取得
        category_name = None
        if item_data.get('categoryId'):
            category_doc = db.collection('Categories').document(item_data['categoryId']).get()
            if category_doc.exists:
                category_name = category_doc.to_dict().get('name')

        # ユーザー名取得
        created_by_name = None
        if item_data.get('createdBy'):
            user_doc = db.collection('Users').document(item_data['createdBy']).get()
            if user_doc.exists:
                created_by_name = user_doc.to_dict().get('displayName')

        assigned_to_name = None
        if item_data.get('assignedTo'):
            user_doc = db.collection('Users').document(item_data['assignedTo']).get()
            if user_doc.exists:
                assigned_to_name = user_doc.to_dict().get('displayName')

        completed_by_name = None
        if item_data.get('completedBy'):
            user_doc = db.collection('Users').document(item_data['completedBy']).get()
            if user_doc.exists:
                completed_by_name = user_doc.to_dict().get('displayName')

        # RecurrenceModelへの変換
        recurrence = None
        if item_data.get('recurrence'):
            from app.models.item import RecurrenceModel
            recurrence = RecurrenceModel(**item_data['recurrence'])

        return ItemResponse(
            itemId=item_data['itemId'],
            familyId=item_data['familyId'],
            type=item_data['type'],
            title=item_data['title'],
            categoryId=item_data['categoryId'],
            categoryName=category_name,
            assignedTo=item_data.get('assignedTo'),
            assignedToName=assigned_to_name,
            priority=item_data['priority'],
            location=item_data.get('location'),
            visibility=item_data['visibility'],
            isCompleted=item_data['isCompleted'],
            completedAt=item_data.get('completedAt'),
            completedBy=item_data.get('completedBy'),
            completedByName=completed_by_name,
            startDateTime=item_data.get('startDateTime'),
            endDateTime=item_data.get('endDateTime'),
            recurrence=recurrence,
            createdBy=item_data['createdBy'],
            createdByName=created_by_name,
            createdAt=item_data['createdAt'],
            updatedAt=item_data['updatedAt']
        )


# ========================================
# デフォルトカテゴリ作成
# ========================================
async def create_default_categories(family_id: str, created_by_uid: str) -> None:
    """
    デフォルトカテゴリを自動作成
    
    Args:
        family_id: 家族ID
        created_by_uid: 作成者UID
    """
    logger.info(f"🔹 Creating default categories for family: {family_id}")

    default_categories = [
        {'name': '家事', 'suggestedFor': ['task', 'event'], 'points': 5},
        {'name': '子育て', 'suggestedFor': ['task', 'event'], 'points': 10},
        {'name': 'その他', 'suggestedFor': ['task', 'event', 'need'], 'points': 3},
        {'name': '庭の手入れ', 'suggestedFor': ['task'], 'points': 15},
        {'name': '車のメンテナンス', 'suggestedFor': ['task'], 'points': 10},
        {'name': '各種手続き', 'suggestedFor': ['task'], 'points': 8},
        {'name': '病院', 'suggestedFor': ['event'], 'points': 5},
        {'name': '習い事', 'suggestedFor': ['event'], 'points': 5},
        {'name': 'ゴミ出し', 'suggestedFor': ['event'], 'points': 3},
        {'name': '食材', 'suggestedFor': ['need'], 'points': 2},
        {'name': '日用品', 'suggestedFor': ['need'], 'points': 2},
        {'name': '家具・家電', 'suggestedFor': ['need'], 'points': 5},
        {'name': '借り物', 'suggestedFor': ['need'], 'points': 3},
    ]

    now = datetime.now(timezone.utc)
    batch = db.batch()

    for category in default_categories:
        category_ref = db.collection('Categories').document()
        category_dict = {
            'categoryId': category_ref.id,
            'familyId': family_id,
            'name': category['name'],
            'suggestedFor': category['suggestedFor'],
            'isDefault': True,
            'usageCount': 0,
            'points': category['points'],
            'createdBy': created_by_uid,
            'createdAt': now,
            'updatedAt': now
        }
        batch.set(category_ref, category_dict)

    batch.commit()

    logger.info(f"✅ Created {len(default_categories)} default categories")


def create_default_categories_sync(family_id: str, created_by_uid: str) -> None:
    """
    デフォルトカテゴリを自動作成（同期版）
    
    Args:
        family_id: 家族ID
        created_by_uid: 作成者UID
    """
    logger.info(f"🔹 Creating default categories for family: {family_id}")

    default_categories = [
        {'name': '家事', 'suggestedFor': ['task', 'event'], 'points': 5},
        {'name': '子育て', 'suggestedFor': ['task', 'event'], 'points': 10},
        {'name': 'その他', 'suggestedFor': ['task', 'event', 'need'], 'points': 3},
        {'name': '庭の手入れ', 'suggestedFor': ['task'], 'points': 15},
        {'name': '車のメンテナンス', 'suggestedFor': ['task'], 'points': 10},
        {'name': '各種手続き', 'suggestedFor': ['task'], 'points': 8},
        {'name': '病院', 'suggestedFor': ['event'], 'points': 5},
        {'name': '習い事', 'suggestedFor': ['event'], 'points': 5},
        {'name': 'ゴミ出し', 'suggestedFor': ['event'], 'points': 3},
        {'name': '食材', 'suggestedFor': ['need'], 'points': 2},
        {'name': '日用品', 'suggestedFor': ['need'], 'points': 2},
        {'name': '家具・家電', 'suggestedFor': ['need'], 'points': 5},
        {'name': '借り物', 'suggestedFor': ['need'], 'points': 3},
    ]

    now = datetime.now(timezone.utc)
    batch = db.batch()

    for category in default_categories:
        category_ref = db.collection('Categories').document()
        category_dict = {
            'categoryId': category_ref.id,
            'familyId': family_id,
            'name': category['name'],
            'suggestedFor': category['suggestedFor'],
            'isDefault': True,
            'usageCount': 0,
            'points': category['points'],
            'createdBy': created_by_uid,
            'createdAt': now,
            'updatedAt': now
        }
        batch.set(category_ref, category_dict)

    batch.commit()

    logger.info(f"✅ Created {len(default_categories)} default categories")