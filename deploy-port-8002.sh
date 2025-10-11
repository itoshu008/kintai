#!/bin/bash

# ポート8002への変更デプロイスクリプト
# 本番サーバーで実行してください

echo "🚀 ポート8002への変更デプロイを開始..."

# 1. 最新のコードを取得
echo "📥 最新のコードを取得中..."
cd /home/itoshu/projects/kintai/kintai
git pull origin main

# 2. フロントエンドをビルド
echo "🔨 フロントエンドをビルド中..."
cd frontend
npm install
npm run build
cd ..

# 3. バックエンドをビルド
echo "⚙️ バックエンドをビルド中..."
cd backend
npm install
npm run build
cd ..

# 4. Nginx設定を更新
echo "🌐 Nginx設定を更新中..."
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

# 5. Nginx設定をテスト
echo "🧪 Nginx設定をテスト中..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx設定テスト成功"
    
    # 6. Nginx再起動
    echo "🔄 Nginxを再起動中..."
    sudo systemctl restart nginx
    
    # 7. バックエンド再起動
    echo "🔄 バックエンドを再起動中..."
    pm2 restart kintai-api
    
    # 8. 動作確認
    echo "🔍 動作確認中..."
    sleep 5
    
    # ローカルヘルスチェック
    echo "📡 ローカルヘルスチェック:"
    curl -s http://localhost:8002/api/admin/health | jq .
    
    # 本番ヘルスチェック
    echo "🌐 本番ヘルスチェック:"
    curl -s https://zatint1991.com/api/admin/health | jq .
    
    echo "✅ デプロイ完了！"
    echo "🌐 アクセス: https://zatint1991.com/admin-dashboard-2024"
    
else
    echo "❌ Nginx設定テスト失敗"
    exit 1
fi
