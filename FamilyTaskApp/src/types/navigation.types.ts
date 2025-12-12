/**
 * ナビゲーション型定義
 * React Navigationの型安全性を確保
 */

import { NavigatorScreenParams } from '@react-navigation/native';
import { ItemType } from './item';

// ============================================
// 認証関連のナビゲーションパラメータ
// ============================================

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

// ============================================
// BottomTabNavigator のパラメータ
// ============================================

export type BottomTabParamList = {
  HomeTab: undefined;
  ItemListTab: { 
    type?: ItemType; 
    defaultView?: 'list' | 'calendar';
    selectAll?: boolean;  // すべてのタイプを選択
  } | undefined;
  AnalyticsTab: undefined;
};

// ============================================
// メインアプリのナビゲーションパラメータ
// ============================================

export type RootStackParamList = {
  // 家族選択前の画面
  FamilyList: undefined;
  CreateFamily: undefined;
  JoinFamily: undefined;
  
  // 家族選択後の画面 - BottomTabNavigator
  Main: NavigatorScreenParams<BottomTabParamList> | undefined;
  FamilyManage: undefined;
  
  // アイテム管理画面（統合）
  ItemForm: { itemId?: string; type?: ItemType } | undefined;
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