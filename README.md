# Slack-Dify Bot

SlackとDifyを連携する会話履歴付きBotです。Supabaseを使用して会話履歴を管理します。

## 機能

- Slackからのメッセージを受信
- Dify APIを使用してAI回答を取得
- Supabaseで会話履歴を管理
- スレッド単位での会話継続

## セキュリティ設定

### 環境変数の設定

本番環境では、シークレット情報を環境変数で管理してください。

https://github.com/NEXASPARK/Secret/blob/main/%E7%92%B0%E5%A2%83%E5%A4%89%E6%95%B0/qa-chatbot-slack-connector.md

#### ローカル開発用の環境変数ファイル

`.env`ファイルを作成してください：

環境変数は以下になります。現状dev環境用のものがなく本番環境につながってしまうので注意してください。


## デプロイ手順

### Google Cloud Projectの設定

```bash
# Google Cloud CLIにログイン
gcloud auth login

# プロジェクトを設定
gcloud config set project agent-apply-management

```

### 手動でDockerイメージをビルド・デプロイする場合

```bash
# Docker buildxを使用してマルチプラットフォーム対応のイメージをビルド・プッシュ
docker buildx build --platform linux/amd64 -t gcr.io/agent-apply-management/qa-chatbot-slack-connector . --push


# 環境変数を設定

以下を参照してください。

https://github.com/NEXASPARK/Secret/blob/main/%E7%92%B0%E5%A2%83%E5%A4%89%E6%95%B0/qa-chatbot-slack-connector.md

# Cloud Runにデプロイ（環境変数を設定）
gcloud run deploy qa-chatbot-slack-connector \
  --image gcr.io/agent-apply-management/qa-chatbot-slack-connector \
  --region asia-northeast1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars SUPABASE_URL="$SUPABASE_URL",SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY",DIFY_API_KEY="$DIFY_API_KEY",SLACK_BOT_TOKEN="$SLACK_BOT_TOKEN"
```

## 環境変数一覧

| 変数名 | 説明 | 必須 |
|--------|------|------|
| `SUPABASE_URL` | SupabaseプロジェクトのURL | ✅ |
| `SUPABASE_ANON_KEY` | Supabaseの匿名キー | ✅ |
| `DIFY_API_KEY` | Dify APIキー | ✅ |
| `SLACK_BOT_TOKEN` | Slack Bot Token | ✅ |
