/**
 * エラーメッセージ定数
 */

export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  // Firebase Authentication エラー
  'auth/user-not-found': 'ユーザーが見つかりません',
  'auth/wrong-password': 'パスワードが間違っています',
  'auth/invalid-email': 'メールアドレスの形式が正しくありません',
  'auth/invalid-credential': 'メールアドレスまたはパスワードが間違っています',
  'auth/email-already-in-use': 'このメールアドレスは既に使用されています',
  'auth/weak-password': 'パスワードは6文字以上である必要があります',
  'auth/too-many-requests': 'リクエストが多すぎます。しばらくしてから再試行してください',
  'auth/network-request-failed': 'ネットワークエラーが発生しました',
  
  // デフォルト
  'default/login': 'ログインに失敗しました',
  'default/register': '登録に失敗しました',
  'default/logout': 'ログアウトに失敗しました',
};

export const getAuthErrorMessage = (code: string, defaultKey: string = 'default/login'): string => {
  return AUTH_ERROR_MESSAGES[code] || AUTH_ERROR_MESSAGES[defaultKey] || '予期しないエラーが発生しました';
};