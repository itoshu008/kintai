#!/bin/bash
# ④ 成功判定（数字でOKか即チェック）

set -Eeuo pipefail

echo "🔍 デプロイ成功判定を開始します..."

echo "📡 LISTEN確認"
echo "Port 8001 listening:"
ss -lntp | grep ':8001' || sudo lsof -iTCP:8001 -sTCP:LISTEN -Pn || echo "❌ Port 8001 not listening"

echo "🏥 ヘルスチェック"
echo "Health endpoint response:"
curl -fsS http://127.0.0.1:8001/api/admin/health || echo "❌ Health check failed"

echo "📋 PM2ログにlistening出力確認"
echo "PM2 logs (searching for 'listening'):"
pm2 logs kintai-api --lines 80 --timestamp | grep -i 'listening' || echo "❌ No 'listening' found in PM2 logs"

echo "📊 PM2状態"
pm2 status kintai-api || echo "❌ PM2 app not found"

echo "✅ 成功判定完了"
