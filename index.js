import express from 'express';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json());

// 🔐 環境変数からシークレット情報を取得（必須）
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const DIFY_API_KEY = process.env.DIFY_API_KEY;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

// 環境変数の必須チェック
const requiredEnvVars = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  DIFY_API_KEY,
  SLACK_BOT_TOKEN
};

const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  console.error('❌ エラー: 以下の環境変数が設定されていません:');
  missingEnvVars.forEach(key => console.error(`   - ${key}`));
  console.error('アプリケーションを終了します。');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

app.post('/slack/events', async (req, res) => {
  // 🔒 Slackリトライ対策
  if (req.headers['x-slack-retry-num']) {
    console.log('Slack retry request ignored');
    return res.status(200).send('Retry ignored');
  }

  const body = req.body;

  if (body.type === 'url_verification') {
    return res.status(200).send(body.challenge);
  }

  const event = body.event;
  if (!event || !event.text) {
    console.log('Invalid event:', event);
    return res.sendStatus(200);
  }

  const threadTs = event.thread_ts || event.ts;
  const userId = event.user;
  const channelId = event.channel;
  const message = event.text.replace(/<@[^>]+>\s*/, '');

  // 🔍 Supabaseからconversation_idを取得
  const { data, error } = await supabase
    .from('conversation_threads')
    .select('conversation_id')
    .eq('slack_thread_ts', threadTs)
    .maybeSingle();

  if (error) {
    console.error('Supabase SELECT error:', error);
  }

  const conversationId = data?.conversation_id || null;

  // 🤖 Difyへメッセージ送信
  const difyRes = await fetch('https://api.dify.ai/v1/chat-messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DIFY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inputs: {},
      query: message,
      conversation_id: conversationId,
      user: userId,
      response_mode: 'blocking'
    })
  }).then(r => r.json());

  console.log('Dify response:', difyRes);

  // 📌 Supabase upsertで重複を回避して保存
  if (!conversationId && difyRes.conversation_id) {
    const upsertResult = await supabase
      .from('conversation_threads')
      .upsert(
        {
          slack_thread_ts: threadTs,
          conversation_id: difyRes.conversation_id,
          user_id: userId
        },
        { onConflict: 'slack_thread_ts' } // ← ここでユニーク制約に対応
      );

    if (upsertResult.error) {
      console.error('Supabase UPSERT error:', upsertResult.error);
    } else {
      console.log('Supabase UPSERT success');
    }
  }

  // 💬 Slackに返信
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      channel: channelId,
      text: difyRes.answer || '申し訳ありません、回答が得られませんでした。',
      thread_ts: threadTs
    })
  });

  return res.sendStatus(200);
});

// Cloud Run ポート
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app; 