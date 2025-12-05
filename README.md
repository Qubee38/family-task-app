# 家族向けタスク管理アプリ

## 概要
家族でタスク・予定・必要物を共有・管理するアプリケーション

## 技術スタック
- **バックエンド**: FastAPI + Firebase Admin SDK
- **フロントエンド**: React Native (Expo)
- **データベース**: Cloud Firestore
- **認証**: Firebase Authentication
- **開発環境**: Docker + Firebase Emulator Suite

## ディレクトリ構成
```
family-task-project/
├── family-task-backend/    # FastAPI バックエンド
├── FamilyTaskApp/          # React Native フロントエンド
└── firebase-project/       # Firebase Emulator設定
```

## セットアップ

### 1. 環境変数の設定
```bash
cd family-task-backend
cp .env.example .env
# .envを編集
```

### 2. Dockerコンテナ起動
```bash
cd family-task-project
docker compose up -d
```

### 3. React Nativeアプリ起動
```bash
cd FamilyTaskApp
npm install
npx expo start
```

## 実装済み機能
- ✅ ユーザー登録
- ✅ ログイン
- ✅ ログアウト
- ✅ Firebase Emulator統合

## 今後の実装予定
- 家族グループ管理
- タスク管理
- 予定管理
- 必要物管理