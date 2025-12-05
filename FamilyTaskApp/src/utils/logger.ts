/**
 * ログ管理ユーティリティ
 */

const LOG_LEVEL = process.env.EXPO_PUBLIC_LOG_LEVEL || 'development';

class Logger {
  private isDevelopment = LOG_LEVEL === 'development';

  debug(...args: any[]) {
    if (this.isDevelopment) {
      console.log('🔹', ...args);
    }
  }

  info(...args: any[]) {
    if (this.isDevelopment) {
      console.log('✅', ...args);
    }
  }

  warn(...args: any[]) {
    if (this.isDevelopment) {
      console.warn('⚠️', ...args);
    }
  }

  error(...args: any[]) {
    console.error('❌', ...args);
  }
}

export const logger = new Logger();