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

export type RootStackParamList = {
  // 家族選択前の画面
  FamilyList: undefined;
  CreateFamily: undefined;
  JoinFamily: undefined;
  
  // 家族選択後の画面
  Home: undefined;
  FamilyManage: undefined;
  
  // アイテム管理画面
  ItemList: undefined;
  CreateEditItem: { itemId?: string } | undefined;  // 編集時はitemIdを渡す
  ItemDetail: { itemId: string };
  
  // 予定管理画面
  EventList: undefined;
  CreateEditEvent: { itemId?: string } | undefined;  // 編集時はitemIdを渡す
  EventDetail: { itemId: string };
  
  // 必要物管理画面
  NeedList: undefined;
  CreateEditNeed: { itemId?: string } | undefined;  // 編集時はitemIdを渡す
  NeedDetail: { itemId: string };
  
  // カテゴリ管理画面
  CategoryList: undefined;
  CreateEditCategory: { categoryId?: string } | undefined;  // 編集時はcategoryIdを渡す
};

// ============================================
// ナビゲーションとルートの型エクスポート
// ============================================

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}