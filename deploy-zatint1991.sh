#!/bin/bash

# 勤怠管理システム - zatint1991.com デプロイスクリプト
# 本番環境用デプロイ

set -e

echo "🚀 勤怠管理システム - zatint1991.com デプロイ開始"

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

# 1. 依存関係のインストール
log_info "依存関係をインストール中..."
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 2. 本番用ビルド
log_info "本番用ビルドを作成中..."
npm run build

# 3. PM2プロセスの停止
log_info "既存のPM2プロセスを停止中..."
pm2 stop kintai-backend 2>/dev/null || true

# 4. 本番環境用の環境変数を設定
log_info "本番環境用の環境変数を設定中..."
export NODE_ENV=production
export PORT=8001
export HOST=0.0.0.0
export TZ=Asia/Tokyo

# 5. PM2で本番環境を起動
log_info "本番環境を起動中..."
pm2 start ecosystem.config.js --env production

# 6. ヘルスチェック
log_info "ヘルスチェックを実行中..."
sleep 5

# API エンドポイントの確認
if curl -f http://localhost:8001/api/admin > /dev/null 2>&1; then
    log_info "✅ API エンドポイントが正常に動作しています"
else
    log_error "❌ API エンドポイントの確認に失敗しました"
    exit 1
fi

# フロントエンドの確認
if curl -f http://localhost:8001 > /dev/null 2>&1; then
    log_info "✅ フロントエンドが正常に動作しています"
else
    log_error "❌ フロントエンドの確認に失敗しました"
    exit 1
fi

# 7. PM2ステータスの表示
log_info "PM2プロセスの状況:"
pm2 list

# 8. ログの表示
log_info "アプリケーションログ:"
pm2 logs kintai-backend --lines 10

echo ""
log_info "🎉 デプロイが完了しました！"
echo ""
echo "🌐 アクセスURL:"
echo "  メイン: https://zatint1991.com"
echo "  マスターページ: https://zatint1991.com/master"
echo "  パーソナルページ: https://zatint1991.com/personal"
echo ""
echo "📊 管理コマンド:"
echo "  PM2ステータス: pm2 list"
echo "  PM2ログ: pm2 logs kintai-backend"
echo "  PM2再起動: pm2 restart kintai-backend"
echo "  PM2停止: pm2 stop kintai-backend"
echo ""
