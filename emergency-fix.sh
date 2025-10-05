#!/bin/bash
set -e

echo "🚨 EMERGENCY FIX Starting..."
echo "📍 Current directory: $(pwd)"
echo "📅 $(date)"

# 現在の状況確認
echo "📊 Current Status:"
echo "🖥️  Server: $(hostname)"
echo "👤 User: $(whoami)"
echo "📁 Directory: $(pwd)"

# PM2完全停止
echo "🛑 Stopping all PM2 processes..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true
echo "✅ PM2 processes stopped"

# ポート8000を強制解放
echo "🔫 Killing processes on port 8000..."
sudo fuser -k 8000/tcp 2>/dev/null || true
echo "✅ Port 8000 freed"

# 最新コード取得
echo "📥 Fetching latest code..."
git fetch origin main
git reset --hard origin/main
echo "✅ Latest code fetched"

# フロントエンドビルド
echo "🔨 Building frontend..."
cd frontend
npm install --silent
npm run build
echo "✅ Frontend built"
cd ..

# バックエンドビルド
echo "🔨 Building backend..."
cd backend
npm install --silent
npm run build
echo "✅ Backend built"
cd ..

# Publicディレクトリ設定
echo "📤 Setting up public directory..."
mkdir -p public
rm -rf public/*
cp -r frontend/dist/* public/
echo "✅ Public directory ready"

# アプリケーションを手動で起動（テスト）
echo "🚀 Starting application manually..."
cd backend
echo "📋 Starting: node dist/index.js"
echo "📋 Press Ctrl+C to stop"
node dist/index.js
