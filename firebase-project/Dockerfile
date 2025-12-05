FROM node:18-alpine

# Java（OpenJDK）をインストール
RUN apk add --no-cache openjdk11-jre

# Firebase CLIをインストール
RUN npm install -g firebase-tools

# 作業ディレクトリ
WORKDIR /firebase

# ポート公開
EXPOSE 4000 8080 9099 9199

# Firebase Emulatorを起動
CMD ["firebase", "emulators:start", "--project", "demo-project"]