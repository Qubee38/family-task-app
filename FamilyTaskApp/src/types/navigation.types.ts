/**
 * ナビゲーション型定義
 * React Navigationの型安全性を確保
 */

import { NavigatorScreenParams } from '@react-navigation/native';

// ============================================
// 認証関連のナビゲーションパラメータ
// ============================================

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

// ============================================
// メインアプリのナビゲーションパラメータ
// ============================================

import { ItemType } from './item';

export type RootStackParamList = {
  // 家族選択前の画面
  FamilyList: undefined;
  CreateFamily: undefined;
  JoinFamily: undefined;
  
  // 家族選択後の画面
  Home: undefined;
  FamilyManage: undefined;
  
  // アイテム管理画面（統合）
  ItemList: { type?: ItemType } | undefined;  // typeで初期フィルターを指定可能
  ItemForm: { itemId?: string; type?: ItemType } | undefined;  // 編集時はitemId、新規作成時はtype指定可能
  ItemDetail: { itemId: string };
  
  // カテゴリ管理画面
  CategoryList: undefined;
  CreateEditCategory: { categoryId?: string } | undefined;
};

// ============================================
// ナビゲーションとルートの型エクスポート
// ============================================

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}