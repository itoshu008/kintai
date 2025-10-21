#!/bin/bash

# 勤怠管理システム - 本番環境デプロイスクリプト
# 使用方法: bash scripts/deploy-production.sh

set -e  # エラー時に停止

echo "🚀 勤怠管理システム デプロイ開始..."

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

# プロジェクトディレクトリに移動
cd /home/itoshu/projects/kintai/kintai

# 1. 最新コードを取得
log_info "最新コードを取得中..."
git fetch origin
git reset --hard origin/main

# 2. バックエンドのセットアップ
log_info "バックエンドをセットアップ中..."
cd backend

# 環境変数ファイルをコピー
cp env.production .env

# 依存関係をインストール
npm ci --production

# ビルド
npm run build

# 3. PM2で再起動
log_info "PM2でアプリケーションを再起動中..."
pm2 stop kintai-api 2>/dev/null || true
pm2 delete kintai-api 2>/dev/null || true
pm2 start pm2.config.cjs --env production

# 4. フロントエンドのセットアップ
log_info "フロントエンドをセットアップ中..."
cd ../frontend

# 依存関係をインストール
npm ci --production

# ビルド
npm run build

# 5. Nginx設定の更新
log_info "Nginx設定を更新中..."
sudo cp /home/itoshu/projects/kintai/kintai/docs/nginx-production.conf /etc/nginx/sites-available/zatint1991.com

# Nginx設定をテスト
if sudo nginx -t; then
    sudo systemctl reload nginx
    log_info "Nginx設定を更新しました"
else
    log_error "Nginx設定にエラーがあります"
    exit 1
fi

# 6. ヘルスチェック
log_info "ヘルスチェックを実行中..."
sleep 10

if curl -f http://localhost:4000/api/admin/health; then
    log_info "✅ ヘルスチェック成功"
else
    log_error "❌ ヘルスチェック失敗"
    exit 1
fi

# 7. PM2ステータス確認
log_info "PM2ステータス:"
pm2 status

# 8. ログ確認
log_info "最新のログ:"
pm2 logs kintai-api --lines 10

log_info "🎉 デプロイ完了！"
log_info "アプリケーションURL: https://zatint1991.com"
