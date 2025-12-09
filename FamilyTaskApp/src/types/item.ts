/**
 * アイテム管理関連の型定義
 * バックエンドのPydanticモデルと対応
 */

// ============================================
// アイテム（タスク/予定/必要物）関連
// ============================================

export type ItemType = 'task' | 'event' | 'need';
export type Priority = 'high' | 'medium' | 'low';
export type Visibility = 'family' | 'private';

export interface RecurrenceModel {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: string;
}

export interface ItemCreateRequest {
  type: ItemType;
  title: string;
  categoryId: string;
  assignedTo?: string;
  priority?: Priority;
  location?: string;
  visibility?: Visibility;
  startDateTime?: string;
  endDateTime?: string;
  recurrence?: RecurrenceModel;
}

export interface ItemUpdateRequest {
  title?: string;
  categoryId?: string;
  assignedTo?: string;
  priority?: Priority;
  location?: string;
  visibility?: Visibility;
  startDateTime?: string;
  endDateTime?: string;
  recurrence?: RecurrenceModel;
}

export interface ItemCompleteRequest {
  completedBy: string;
}

export interface ItemResponse {
  itemId: string;
  familyId: string;
  type: ItemType;
  title: string;
  categoryId: string;
  categoryName?: string;
  assignedTo?: string;
  assignedToName?: string;
  priority: Priority;
  location?: string;
  visibility: Visibility;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: string;
  completedByName?: string;
  startDateTime?: string;
  endDateTime?: string;
  recurrence?: RecurrenceModel;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// カテゴリ関連
// ============================================

export interface CategoryCreateRequest {
  name: string;
  suggestedFor?: ItemType[];
  points?: number;
}

export interface CategoryResponse {
  categoryId: string;
  familyId: string;
  name: string;
  suggestedFor: ItemType[];
  isDefault: boolean;
  usageCount: number;
  points?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// API レスポンス関連
// ============================================

export interface ItemListResponse {
  items: ItemResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface CategoryListResponse {
  categories: CategoryResponse[];
}

export interface ItemCompleteResponse {
  itemId: string;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: string;
  pointsEarned?: number;
}

// ============================================
// フィルター関連
// ============================================

export interface ItemFilter {
  type?: ItemType;
  isCompleted?: boolean;
  assignedTo?: string;
  categoryId?: string;
  visibility?: Visibility;
  limit?: number;
  offset?: number;
}