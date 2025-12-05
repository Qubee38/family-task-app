import React, { createContext, useState, useEffect, useContext } from 'react';
import { signInWithEmailAndPassword, signInWithCustomToken, signOut as firebaseSignOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../config/firebase';
import axios from 'axios';

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
      console.log('🔹 認証状態変化:', firebaseUser?.email || 'ログアウト');
      
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          const response = await axios.get('http://localhost:8000/api/auth/me', {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          });
          console.log('✅ ユーザー情報取得成功:', response.data);
        } catch (error) {
          console.error('❌ ユーザー情報取得エラー:', error);
        }
      }
      
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      console.log('🔹 登録開始:', email);
      
      // 直接axiosで送信（apiインスタンスを使わない）
      const response = await axios.post(
        'http://localhost:8000/api/auth/register',
        {
          email: email,
          password: password,
          displayName: displayName,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ バックエンド登録成功:', response.data);

      const { customToken } = response.data;

      console.log('🔹 カスタムトークンでサインイン');
      await signInWithCustomToken(auth, customToken);

      console.log('✅ 登録完了');
    } catch (error: any) {
      console.error('❌ 登録エラー:', error);
      console.error('❌ エラー詳細:', error.response?.data);
      
      let errorMessage = '登録に失敗しました';
      
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
      console.log('🔹 ログイン開始:', email);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Firebase Authログイン成功:', userCredential.user.uid);
    } catch (error: any) {
      console.error('❌ ログインエラー:', error);
      
      let errorMessage = 'ログインに失敗しました';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'ユーザーが見つかりません';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'パスワードが間違っています';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'メールアドレスの形式が正しくありません';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'メールアドレスまたはパスワードが間違っています';
      }
      
      throw new Error(errorMessage);
    }
  };

  const signOut = async () => {
    try {
      console.log('🔹 ログアウト開始');
      await firebaseSignOut(auth);
      console.log('✅ ログアウト成功');
      setUser(null);
    } catch (error) {
      console.error('❌ ログアウトエラー:', error);
      throw error;
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