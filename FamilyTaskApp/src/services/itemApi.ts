/**
 * アイテム管理APIクライアント
 * バックエンドのアイテム管理エンドポイントと対応
 */

import api from './api';
import {
  ItemCreateRequest,
  ItemUpdateRequest,
  ItemCompleteRequest,
  ItemResponse,
  ItemListResponse,
  ItemCompleteResponse,
  CategoryCreateRequest,
  CategoryResponse,
  CategoryListResponse,
  ItemFilter,
} from '../types/item';

// ============================================
// アイテム管理API
// ============================================

/**
 * アイテムを作成
 */
export const createItem = async (
  familyId: string,
  data: ItemCreateRequest
): Promise<ItemResponse> => {
  const response = await api.post<{ success: boolean; data: ItemResponse }>(
    `/api/families/${familyId}/items`,
    data
  );
  return response.data.data;
};

/**
 * アイテム一覧を取得（フィルタリング、ページネーション対応）
 */
export const getItems = async (
  familyId: string,
  filter?: ItemFilter
): Promise<ItemListResponse> => {
  const response = await api.get<{ success: boolean; data: ItemListResponse }>(
    `/api/families/${familyId}/items`,
    { params: filter }
  );
  return response.data.data;
};

/**
 * アイテム詳細を取得
 */
export const getItem = async (
  familyId: string,
  itemId: string
): Promise<ItemResponse> => {
  const response = await api.get<{ success: boolean; data: ItemResponse }>(
    `/api/families/${familyId}/items/${itemId}`
  );
  return response.data.data;
};

/**
 * アイテムを更新
 */
export const updateItem = async (
  familyId: string,
  itemId: string,
  data: ItemUpdateRequest
): Promise<ItemResponse> => {
  const response = await api.put<{ success: boolean; data: ItemResponse }>(
    `/api/families/${familyId}/items/${itemId}`,
    data
  );
  return response.data.data;
};

/**
 * アイテムを削除
 */
export const deleteItem = async (
  familyId: string,
  itemId: string
): Promise<void> => {
  await api.delete(`/api/families/${familyId}/items/${itemId}`);
};

/**
 * アイテムを完了
 */
export const completeItem = async (
  familyId: string,
  itemId: string,
  data: ItemCompleteRequest
): Promise<ItemCompleteResponse> => {
  const response = await api.put<{ success: boolean; data: ItemCompleteResponse }>(
    `/api/families/${familyId}/items/${itemId}/complete`,
    data
  );
  return response.data.data;
};

/**
 * アイテムを未完了に戻す
 */
export const uncompleteItem = async (
  familyId: string,
  itemId: string
): Promise<ItemCompleteResponse> => {
  const response = await api.put<{ success: boolean; data: ItemCompleteResponse }>(
    `/api/families/${familyId}/items/${itemId}/uncomplete`
  );
  return response.data.data;
};

// ============================================
// カテゴリ管理API
// ============================================

/**
 * カテゴリ一覧を取得（usageCount降順）
 */
export const getCategories = async (
  familyId: string
): Promise<CategoryResponse[]> => {
  const response = await api.get<{ success: boolean; data: CategoryListResponse }>(
    `/api/families/${familyId}/categories`
  );
  return response.data.data.categories;
};

/**
 * カテゴリを作成
 */
export const createCategory = async (
  familyId: string,
  data: CategoryCreateRequest
): Promise<CategoryResponse> => {
  const response = await api.post<{ success: boolean; data: CategoryResponse }>(
    `/api/families/${familyId}/categories`,
    data
  );
  return response.data.data;
};

/**
 * カテゴリを更新
 */
export const updateCategory = async (
  familyId: string,
  categoryId: string,
  data: CategoryCreateRequest
): Promise<CategoryResponse> => {
  const response = await api.put<{ success: boolean; data: CategoryResponse }>(
    `/api/families/${familyId}/categories/${categoryId}`,
    data
  );
  return response.data.data;
};

/**
 * カテゴリを削除
 */
export const deleteCategory = async (
  familyId: string,
  categoryId: string
): Promise<void> => {
  await api.delete(`/api/families/${familyId}/categories/${categoryId}`);
};

// ============================================
// オブジェクト形式でエクスポート（オプション）
// ============================================

export const itemApi = {
  // アイテム管理
  createItem,
  getItems,
  getItem,
  updateItem,
  deleteItem,
  completeItem,
  uncompleteItem,
  
  // カテゴリ管理
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};

export default itemApi;