#!/bin/bash

# 本番環境API修正デプロイスクリプト
echo "🚀 本番環境API修正デプロイを開始します..."

# 1. 最新のコードを取得
echo "📥 最新のコードを取得中..."
git pull origin main

# 2. フロントエンドをビルド
echo "📦 フロントエンドをビルド中..."
cd frontend
npm run build
if [ $? -ne 0 ]; then
    echo "❌ フロントエンドのビルドに失敗しました"
    exit 1
fi
cd ..

# 3. バックエンドをビルド
echo "🔨 バックエンドをビルド中..."
cd backend
npm run build
if [ $? -ne 0 ]; then
    echo "❌ バックエンドのビルドに失敗しました"
    exit 1
fi
cd ..

# 4. フロントエンドファイルをコピー
echo "📤 フロントエンドファイルをコピー中..."
cp -r frontend/dist/* public/

# 5. バックエンドを再起動
echo "🔄 バックエンドを再起動中..."
pm2 restart kintai-backend
if [ $? -ne 0 ]; then
    echo "❌ バックエンドの再起動に失敗しました"
    exit 1
fi

# 6. 起動を待つ
echo "⏳ サーバー起動を待機中..."
sleep 10

# 7. ヘルスチェック
echo "🔍 ヘルスチェックを実行中..."
curl -f http://localhost:8001/api/admin/health
if [ $? -eq 0 ]; then
    echo "✅ バックエンドAPIが正常に動作しています"
else
    echo "❌ バックエンドAPIの確認に失敗しました"
    pm2 logs kintai-backend --lines 20
    exit 1
fi

# 8. 完了メッセージ
echo ""
echo "🎉 デプロイが完了しました！"
echo ""
echo "🌐 アクセス先:"
echo "  メイン: https://zatint1991.com"
echo "  API: https://zatint1991.com/api/admin"
echo "  ヘルスチェック: https://zatint1991.com/api/admin/health"
echo ""
echo "📊 管理コマンド:"
echo "  PM2ステータス: pm2 list"
echo "  PM2ログ: pm2 logs kintai-backend"
echo "  PM2再起動: pm2 restart kintai-backend"
echo ""
