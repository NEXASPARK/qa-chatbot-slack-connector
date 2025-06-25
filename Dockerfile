# Node.js 18の公式イメージを使用
FROM node:18-slim

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci --only=production

# アプリケーションのソースコードをコピー
COPY . .

# ポート8080を公開
EXPOSE 8080

# アプリケーションを起動
CMD [ "npm", "start" ] 