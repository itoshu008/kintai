#!/bin/bash

# PM2ポート8002への更新スクリプト
# 本番サーバーで実行してください

echo "🔧 PM2ポート8002への更新を開始..."

# 1. 現在のPM2プロセスを停止
echo "🛑 1. 現在のPM2プロセスを停止:"
echo "================================"
pm2 delete kintai-api 2>/dev/null || true
pm2 delete kintai-backend 2>/dev/null || true

# 2. 最新のコードを取得
echo ""
echo "📥 2. 最新のコードを取得:"
echo "================================"
cd /home/itoshu/projects/kintai/kintai
git pull origin main

# 3. バックエンドをビルド
echo ""
echo "⚙️ 3. バックエンドをビルド:"
echo "================================"
cd backend
npm install
npm run build
cd ..

# 4. PM2設定ファイルでポート8002を確認
echo ""
echo "📋 4. PM2設定ファイル確認:"
echo "================================"
echo "PM2設定ファイルの内容:"
cat backend-pm2.config.js | grep -A 5 -B 5 PORT

# 5. PM2でポート8002でバックエンドを起動
echo ""
echo "🚀 5. PM2でポート8002でバックエンドを起動:"
echo "================================"
pm2 start backend-pm2.config.js

# 6. PM2プロセス状態確認
echo ""
echo "📊 6. PM2プロセス状態確認:"
echo "================================"
pm2 list

# 7. ポート8002の確認
echo ""
echo "🔌 7. ポート8002の確認:"
echo "================================"
echo "ポート8002でリッスンしているプロセス:"
sudo netstat -tulnp | grep :8002 || echo "❌ ポート8002でリッスンしているプロセスが見つかりません"

# 8. 動作確認
echo ""
echo "🧪 8. 動作確認:"
echo "================================"
sleep 5

# ローカルヘルスチェック
echo "📡 ローカルヘルスチェック (ポート8002):"
LOCAL_HEALTH=$(curl -s http://localhost:8002/api/admin/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ ローカルヘルスチェック成功:"
    echo "$LOCAL_HEALTH" | jq . 2>/dev/null || echo "$LOCAL_HEALTH"
else
    echo "❌ ローカルヘルスチェック失敗"
fi

# 本番ヘルスチェック
echo ""
echo "🌐 本番ヘルスチェック:"
PROD_HEALTH=$(curl -s https://zatint1991.com/api/admin/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ 本番ヘルスチェック成功:"
    echo "$PROD_HEALTH" | jq . 2>/dev/null || echo "$PROD_HEALTH"
else
    echo "❌ 本番ヘルスチェック失敗"
fi

echo ""
echo "✅ PM2ポート8002への更新完了！"
echo "🌐 アクセス: https://zatint1991.com/admin-dashboard-2024"
