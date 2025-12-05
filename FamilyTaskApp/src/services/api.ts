import axios, { AxiosError } from 'axios';
import { auth } from '../config/firebase';
import { logger } from '../utils/logger';
import Constants from 'expo-constants';

const expoConfig = Constants.expoConfig?.extra || {};
const API_BASE_URL = expoConfig.apiBaseUrl || 'http://localhost:8000';

console.log('🔹 API_BASE_URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// リクエストインターセプター
api.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
        logger.debug('認証トークンを追加しました');
      } catch (error) {
        logger.error('トークン取得エラー:', error);
      }
    }
    return config;
  },
  (error) => {
    logger.error('リクエストエラー:', error);
    return Promise.reject(error);
  }
);

// レスポンスインターセプター
api.interceptors.response.use(
  (response) => {
    logger.debug(`API成功: ${response.config.method?.toUpperCase()} ${response.config.url}`);
    return response;
  },
  async (error: AxiosError) => {
    if (error.response) {
      const status = error.response.status;
      
      if (status === 401) {
        logger.warn('認証エラー: ログアウトします');
        // ログアウト処理は AuthContext で実施
      } else if (status === 403) {
        logger.warn('権限エラー: アクセスが拒否されました');
      } else if (status >= 500) {
        logger.error('サーバーエラー:', status);
      } else {
        logger.warn(`HTTPエラー ${status}:`, error.response.data);
      }
    } else if (error.request) {
      logger.error('ネットワークエラー: サーバーに接続できません');
    } else {
      logger.error('リクエスト設定エラー:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api;