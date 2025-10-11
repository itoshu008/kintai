#!/bin/bash

# 簡易版デプロイスクリプト
# 基本的なデプロイ手順のみ

echo "🚀 Simple Deploy Script"

# プロジェクトディレクトリに移動
cd /home/zatint1991-hvt55/zatint1991.com

# Git更新
echo "📥 Updating from GitHub..."
git fetch origin
git reset --hard origin/main

# 依存関係インストール
echo "📦 Installing dependencies..."
npm ci

# バックエンドビルド
echo "🔨 Building backend..."
cd backend && npm ci && npm run build && cd ..

# フロントエンドビルド
echo "🔨 Building frontend..."
cd frontend && npm ci && npm run build && cd ..

# PM2再起動
echo "🔄 Restarting PM2..."
pm2 restart all

echo "✅ Deploy completed!"
