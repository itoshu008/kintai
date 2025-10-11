#!/bin/bash

# 本番サーバーの状態確認スクリプト
# 本番サーバーで実行してください

echo "🔍 本番サーバーの状態確認を開始..."

# 1. バックエンドの状態確認
echo ""
echo "📊 1. PM2プロセス状態確認:"
echo "================================"
pm2 list

echo ""
echo "📋 PM2ログ確認 (最新20行):"
echo "================================"
pm2 logs kintai-api --lines 20

# 2. Nginxのログ確認
echo ""
echo "🌐 2. Nginxエラーログ確認:"
echo "================================"
if [ -f /var/log/nginx/error.log ]; then
    echo "最新のエラーログ (最新20行):"
    sudo tail -20 /var/log/nginx/error.log
else
    echo "❌ Nginxエラーログファイルが見つかりません"
fi

echo ""
echo "📝 Nginxアクセスログ確認:"
echo "================================"
if [ -f /var/log/nginx/access.log ]; then
    echo "最新のアクセスログ (最新10行):"
    sudo tail -10 /var/log/nginx/access.log
else
    echo "❌ Nginxアクセスログファイルが見つかりません"
fi

# 3. バックエンドのポート確認
echo ""
echo "🔌 3. ポート8002の確認:"
echo "================================"
echo "ポート8002でリッスンしているプロセス:"
sudo netstat -tulnp | grep :8002 || echo "❌ ポート8002でリッスンしているプロセスが見つかりません"

echo ""
echo "ポート8002の詳細情報:"
sudo ss -tulnp | grep :8002 || echo "❌ ポート8002の詳細情報が見つかりません"

# 4. フロントエンドのデプロイ状態確認
echo ""
echo "📁 4. フロントエンドのデプロイ状態確認:"
echo "================================"
FRONTEND_PATH="/home/itoshu/projects/kintai/kintai/frontend/dist"
if [ -d "$FRONTEND_PATH" ]; then
    echo "✅ フロントエンドディレクトリが存在します: $FRONTEND_PATH"
    echo "ファイル一覧:"
    ls -la "$FRONTEND_PATH"
    
    if [ -f "$FRONTEND_PATH/index.html" ]; then
        echo "✅ index.html が存在します"
    else
        echo "❌ index.html が見つかりません"
    fi
else
    echo "❌ フロントエンドディレクトリが存在しません: $FRONTEND_PATH"
fi

# 5. バックエンドの再起動
echo ""
echo "🔄 5. バックエンドの再起動:"
echo "================================"
echo "PM2でバックエンドを再起動中..."
pm2 restart kintai-api

echo ""
echo "再起動後の状態:"
pm2 list

# 6. 動作確認
echo ""
echo "🧪 6. 動作確認:"
echo "================================"

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

# フロントエンド確認
echo ""
echo "🌐 フロントエンド確認:"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://zatint1991.com/admin-dashboard-2024 2>/dev/null)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ フロントエンド正常 (HTTP $FRONTEND_STATUS)"
else
    echo "❌ フロントエンド異常 (HTTP $FRONTEND_STATUS)"
fi

echo ""
echo "🎯 確認完了！"
echo "================================"
echo "🌐 アクセスURL: https://zatint1991.com/admin-dashboard-2024"
echo "🔧 API URL: https://zatint1991.com/api/admin/health"
