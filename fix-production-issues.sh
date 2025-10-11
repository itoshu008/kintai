#!/bin/bash

# 本番サーバーの問題修正スクリプト
# 本番サーバーで実行してください

echo "🔧 本番サーバーの問題修正を開始..."

# 1. 最新のコードを取得
echo ""
echo "📥 1. 最新のコードを取得:"
echo "================================"
cd /home/itoshu/projects/kintai/kintai
git pull origin main

# 2. フロントエンドをビルド
echo ""
echo "🔨 2. フロントエンドをビルド:"
echo "================================"
cd frontend
npm install
npm run build
cd ..

# 3. バックエンドをビルド
echo ""
echo "⚙️ 3. バックエンドをビルド:"
echo "================================"
cd backend
npm install
npm run build
cd ..

# 4. PM2プロセスを完全に停止・再起動
echo ""
echo "🔄 4. PM2プロセスを再起動:"
echo "================================"
pm2 delete kintai-api 2>/dev/null || true
pm2 start backend/dist/index.js --name kintai-api

# 5. Nginx設定を更新
echo ""
echo "🌐 5. Nginx設定を更新:"
echo "================================"
sudo tee /etc/nginx/sites-available/zatint1991.com > /dev/null << 'EOF'
server {
    listen 80;
    server_name zatint1991.com www.zatint1991.com;

    # フロントエンドの静的ファイル
    location / {
        root /home/itoshu/projects/kintai/kintai/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API プロキシ設定（ポート8002）
    location /api/ {
        proxy_pass http://127.0.0.1:8002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # セキュリティヘッダー
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
EOF

# 6. Nginx設定をテスト
echo ""
echo "🧪 6. Nginx設定をテスト:"
echo "================================"
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx設定テスト成功"
    
    # 7. Nginx再起動
    echo ""
    echo "🔄 7. Nginxを再起動:"
    echo "================================"
    sudo systemctl restart nginx
    
    # 8. 動作確認
    echo ""
    echo "🔍 8. 動作確認:"
    echo "================================"
    sleep 5
    
    # ローカルヘルスチェック
    echo "📡 ローカルヘルスチェック:"
    curl -s http://localhost:8002/api/admin/health | jq . || echo "❌ ローカルヘルスチェック失敗"
    
    # 本番ヘルスチェック
    echo ""
    echo "🌐 本番ヘルスチェック:"
    curl -s https://zatint1991.com/api/admin/health | jq . || echo "❌ 本番ヘルスチェック失敗"
    
    # フロントエンド確認
    echo ""
    echo "🌐 フロントエンド確認:"
    FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://zatint1991.com/admin-dashboard-2024)
    if [ "$FRONTEND_STATUS" = "200" ]; then
        echo "✅ フロントエンド正常 (HTTP $FRONTEND_STATUS)"
    else
        echo "❌ フロントエンド異常 (HTTP $FRONTEND_STATUS)"
    fi
    
    echo ""
    echo "✅ 修正完了！"
    echo "🌐 アクセス: https://zatint1991.com/admin-dashboard-2024"
    
else
    echo "❌ Nginx設定テスト失敗"
    echo "Nginx設定を手動で確認してください"
    exit 1
fi
