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
};

// ============================================
// ナビゲーションとルートの型エクスポート
// ============================================

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}