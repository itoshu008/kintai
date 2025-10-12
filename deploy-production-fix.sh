#!/bin/bash

# 勤怠管理システム - 本番環境修正デプロイスクリプト
# APIプロキシ問題の修正

set -e

echo "🚀 本番環境修正デプロイ開始"

# 色付きログ関数
log_info() {
    echo -e "\033[32m[INFO]\033[0m $1"
}

log_warn() {
    echo -e "\033[33m[WARN]\033[0m $1"
}

log_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

# 1. 現在のディレクトリを確認
log_info "現在のディレクトリ: $(pwd)"

# 2. 最新のコードを取得
log_info "最新のコードを取得中..."
git fetch origin
git reset --hard origin/main

# 3. 依存関係のインストール
log_info "依存関係をインストール中..."
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 4. 本番用ビルド
log_info "本番用ビルドを作成中..."
cd backend && npm run build && cd ..
cd frontend && npm run build && cd ..

# 5. 環境変数の設定
log_info "本番環境用の環境変数を設定中..."
export NODE_ENV=production
export PORT=8001
export HOST=0.0.0.0
export TZ=Asia/Tokyo

# 6. PM2プロセスの停止と再起動
log_info "PM2プロセスを再起動中..."
pm2 stop kintai-backend 2>/dev/null || true
pm2 delete kintai-backend 2>/dev/null || true

# 7. バックエンドを起動
log_info "バックエンドを起動中..."
pm2 start backend/dist/index.js --name kintai-backend --env production

# 8. 起動を待つ
log_info "サーバー起動を待機中..."
sleep 10

# 9. ヘルスチェック
log_info "ヘルスチェックを実行中..."

# ローカルAPI確認
if curl -f http://localhost:8001/api/admin/health > /dev/null 2>&1; then
    log_info "✅ ローカルAPI エンドポイントが正常に動作しています"
else
    log_error "❌ ローカルAPI エンドポイントの確認に失敗しました"
    pm2 logs kintai-backend --lines 20
    exit 1
fi

# 10. PM2ステータスの表示
log_info "PM2プロセスの状況:"
pm2 list

# 11. ログの表示
log_info "アプリケーションログ:"
pm2 logs kintai-backend --lines 10

echo ""
log_info "🎉 本番環境修正デプロイが完了しました！"
echo ""
echo "🌐 アクセスURL:"
echo "  メイン: https://zatint1991.com"
echo "  API: https://zatint1991.com/api/admin"
echo "  ヘルスチェック: https://zatint1991.com/api/admin/health"
echo ""
echo "📊 管理コマンド:"
echo "  PM2ステータス: pm2 list"
echo "  PM2ログ: pm2 logs kintai-backend"
echo "  PM2再起動: pm2 restart kintai-backend"
echo ""
echo "🔧 Nginx設定更新が必要な場合:"
echo "  sudo cp nginx-zatint1991-fixed.conf /etc/nginx/sites-available/zatint1991.com"
echo "  sudo nginx -t"
echo "  sudo systemctl restart nginx"
echo ""
