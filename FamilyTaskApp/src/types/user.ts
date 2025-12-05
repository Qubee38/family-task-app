/**
 * ユーザー関連の型定義
 * バックエンドのPydanticモデルと対応
 */

export interface UserBase {
  email: string;
  displayName: string;
}

export interface UserCreate extends UserBase {
  password: string;
}

export interface UserResponse extends UserBase {
  uid: string;
  photoURL: string | null;
  createdAt: string;
  customToken: string;
}

export interface UserInDB extends UserBase {
  uid: string;
  photoURL: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  uid: string;
  email: string;
  displayName: string;
  idToken: string;
  refreshToken: string;
}