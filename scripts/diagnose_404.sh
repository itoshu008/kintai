#!/usr/bin/env bash
# 404エラーの包括的診断スクリプト

set -Eeuo pipefail

BUILD_USER="itoshu"
VPS_HOST="zatint1991.com"

echo "🔍 404エラー包括的診断開始"
echo "=================================="

ssh "$BUILD_USER@$VPS_HOST" '
  set -Eeuo pipefail
  
  echo "== 1. システム状態確認 =="
  echo "日時: $(date)"
  echo "ホスト名: $(hostname)"
  echo "ユーザー: $(whoami)"
  
  echo ""
  echo "== 2. Nginx状態確認 =="
  echo "Nginx status:"
  sudo systemctl status nginx --no-pager -l || true
  echo ""
  echo "Nginx設定テスト:"
  sudo nginx -t || true
  echo ""
  echo "Nginx設定ファイル内容:"
  sudo cat /etc/nginx/sites-enabled/zatint1991.com | grep -A 10 -B 2 "location /api" || true
  
  echo ""
  echo "== 3. PM2状態確認 =="
  echo "PM2 status:"
  pm2 status || true
  echo ""
  echo "PM2 logs (最新50行):"
  pm2 logs kintai-api --lines 50 --timestamp || true
  
  echo ""
  echo "== 4. ポート8001確認 =="
  echo "ポート8001リスニング確認:"
  ss -lntp | grep :8001 || echo "❌ ポート8001でリスニングしていません"
  echo ""
  echo "ポート8001プロセス確認:"
  sudo lsof -iTCP:8001 -sTCP:LISTEN -Pn || echo "❌ ポート8001のプロセスが見つかりません"
  
  echo ""
  echo "== 5. バックエンド直接テスト =="
  echo "バックエンド直接接続テスト:"
  curl -fsS --max-time 10 "http://127.0.0.1:8001/api/admin/health" || echo "❌ バックエンド直接接続失敗"
  echo ""
  echo "バックエンドAPI一覧テスト:"
  curl -fsS --max-time 10 "http://127.0.0.1:8001/api/health" || echo "❌ /api/health 接続失敗"
  
  echo ""
  echo "== 6. Nginxプロキシテスト =="
  echo "Nginx経由API接続テスト:"
  curl -fsS --max-time 10 "https://zatint1991.com/api/admin/health" || echo "❌ Nginx経由API接続失敗"
  echo ""
  echo "Nginx経由API一覧テスト:"
  curl -fsS --max-time 10 "https://zatint1991.com/api/health" || echo "❌ Nginx経由 /api/health 接続失敗"
  
  echo ""
  echo "== 7. ログファイル確認 =="
  echo "Nginx エラーログ (最新20行):"
  sudo tail -n 20 /var/log/nginx/error.log || true
  echo ""
  echo "Nginx アクセスログ (最新20行):"
  sudo tail -n 20 /var/log/nginx/access.log || true
  
  echo ""
  echo "== 8. ファイル存在確認 =="
  echo "バックエンドファイル確認:"
  ls -la /home/zatint1991-hvt55/zatint1991.com/backend/dist/ || true
  echo ""
  echo "フロントエンドファイル確認:"
  ls -la /home/zatint1991-hvt55/zatint1991.com/public/kintai/ || true
  
  echo ""
  echo "== 9. 環境変数確認 =="
  echo "PM2環境変数:"
  pm2 show kintai-api | grep -A 20 "env:" || true
  
  echo ""
  echo "== 10. プロセス詳細確認 =="
  echo "Node.jsプロセス:"
  ps aux | grep node || true
  echo ""
  echo "Nginxプロセス:"
  ps aux | grep nginx || true
  
  echo ""
  echo "🔍 診断完了"
'
