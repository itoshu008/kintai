#!/bin/bash

# ヘルスチェックエンドポイント修正のデプロイスクリプト
# 使用方法: bash deploy-health-fix.sh

set -e

echo "🚀 ヘルスチェックエンドポイント修正のデプロイを開始..."

# 1. 最新のコードを取得
echo "📥 最新のコードを取得中..."
git fetch origin
git reset --hard origin/main

# 2. 依存関係をインストール
echo "📦 依存関係をインストール中..."
cd backend
npm ci
cd ../frontend
npm ci
cd ..

# 3. バックエンドをビルド
echo "🔨 バックエンドをビルド中..."
cd backend
npm run build
cd ..

# 4. フロントエンドをビルド
echo "🎨 フロントエンドをビルド中..."
cd frontend
npm run build
cd ..

# 5. PM2でバックエンドを再起動
echo "🔄 バックエンドを再起動中..."
pm2 restart kintai-api || pm2 start backend/dist/index.js --name kintai-api

# 6. ヘルスチェックをテスト
echo "🏥 ヘルスチェックをテスト中..."
sleep 3

# ローカルテスト
echo "ローカルヘルスチェック:"
curl -s http://localhost:8000/api/admin/health | jq . || echo "ローカルテスト失敗"

# 本番テスト
echo "本番ヘルスチェック:"
curl -s https://zatint1991.com/api/admin/health | jq . || echo "本番テスト失敗"

echo "✅ デプロイ完了！"
echo "📊 PM2ステータス:"
pm2 status

echo "📋 ログ確認:"
echo "pm2 logs kintai-api --lines 20"
