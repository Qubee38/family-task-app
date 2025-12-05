import React, { createContext, useState, useEffect, useContext } from 'react';
import { signInWithEmailAndPassword, signInWithCustomToken, signOut as firebaseSignOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../config/firebase';
import api from '../services/api';
import { UserResponse } from '../types';
import { getAuthErrorMessage } from '../constants';
import { logger } from '../utils/logger';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      logger.debug('認証状態変化:', firebaseUser?.email || 'ログアウト');
      
      if (firebaseUser) {
        try {
          const response = await api.get('/api/auth/me');
          logger.info('ユーザー情報取得成功:', response.data.email);
        } catch (error) {
          logger.error('ユーザー情報取得エラー:', error);
        }
      }
      
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      logger.debug('登録開始:', email);
      
      // バックエンドでユーザー登録
      const response = await api.post<UserResponse>('/api/auth/register', {
        email,
        password,
        displayName,
      });

      logger.info('バックエンド登録成功:', response.data.uid);

      const { customToken } = response.data;

      // カスタムトークンでFirebase Authにサインイン
      logger.debug('カスタムトークンでサインイン');
      await signInWithCustomToken(auth, customToken);

      logger.info('登録完了');
    } catch (error: any) {
      logger.error('登録エラー:', error);
      
      let errorMessage = getAuthErrorMessage(error.code, 'default/register');
      
      // Pydanticバリデーションエラー
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          errorMessage = detail.map((err: any) => `${err.loc.join('.')}: ${err.msg}`).join('\n');
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        }
      }
      
      throw new Error(errorMessage);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      logger.debug('ログイン開始:', email);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      logger.info('Firebase Authログイン成功:', userCredential.user.uid);
    } catch (error: any) {
      logger.error('ログインエラー:', error);
      
      const errorMessage = getAuthErrorMessage(error.code, 'default/login');
      throw new Error(errorMessage);
    }
  };

  const signOut = async () => {
    try {
      logger.debug('ログアウト開始');
      await firebaseSignOut(auth);
      logger.info('ログアウト成功');
      setUser(null);
    } catch (error) {
      logger.error('ログアウトエラー:', error);
      throw new Error(getAuthErrorMessage('default/logout'));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};