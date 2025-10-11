#!/bin/bash

# 完全なデプロイスクリプト - ヘルスチェックエンドポイント修正版
# 使用方法: bash deploy-complete.sh

set -e

echo "🚀 完全なデプロイを開始..."

# 1. 最新のコードを取得
echo "📥 最新のコードを取得中..."
git fetch origin
git reset --hard origin/main

# 2. 環境変数ファイルをコピー
echo "⚙️ 環境変数を設定中..."
if [ -f "backend/env.production" ]; then
    cp backend/env.production backend/.env
    echo "✅ 本番環境変数をコピーしました"
else
    echo "⚠️ env.production が見つかりません。env.example を使用します"
    cp backend/env.example backend/.env
fi

# 3. 依存関係をインストール
echo "📦 依存関係をインストール中..."
cd backend
npm ci
cd ../frontend
npm ci
cd ..

# 4. バックエンドをビルド
echo "🔨 バックエンドをビルド中..."
cd backend
npm run build
cd ..

# 5. フロントエンドをビルド
echo "🎨 フロントエンドをビルド中..."
cd frontend
npm run build
cd ..

# 6. PM2でアプリケーションを再起動
echo "🔄 アプリケーションを再起動中..."
pm2 restart all || pm2 start backend/dist/index.js --name kintai-api

# 7. ヘルスチェックをテスト
echo "🏥 ヘルスチェックをテスト中..."
sleep 5

# ローカルテスト
echo "ローカルヘルスチェック:"
curl -s http://localhost:8000/api/admin/health | jq . || echo "ローカルテスト失敗"

# 本番テスト
echo "本番ヘルスチェック:"
curl -s https://zatint1991.com/api/admin/health | jq . || echo "本番テスト失敗"

echo "✅ デプロイ完了！"
echo "📊 PM2ステータス:"
pm2 status

echo "📋 ログ確認コマンド:"
echo "pm2 logs kintai-api --lines 20"

echo "🔍 ヘルスチェックコマンド:"
echo "curl http://localhost:8000/api/admin/health"
echo "curl https://zatint1991.com/api/admin/health"
