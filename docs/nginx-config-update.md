# Nginx設定更新手順

## 本番サーバーで実行するコマンド

### 1. Nginx設定ファイルの確認
```bash
sudo nano /etc/nginx/sites-available/zatint1991.com
```

### 2. 設定内容の更新
以下の設定に変更してください：

```nginx
server {
    listen 80;
    server_name zatint1991.com www.zatint1991.com;

    # フロントエンドの静的ファイル
    location / {
        root /home/itoshu/projects/kintai/kintai/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API プロキシ設定（ポート8001に変更）
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
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
```

### 3. 設定のテスト
```bash
sudo nginx -t
```

### 4. Nginx再起動
```bash
sudo systemctl restart nginx
```

### 5. バックエンド再起動
```bash
cd /home/itoshu/projects/kintai/kintai
pm2 restart kintai-api
```

### 6. 動作確認
```bash
curl https://zatint1991.com/api/admin/health
```
