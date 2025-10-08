# デプロイ設定 - ポート8001統一

## 概要

バックエンドの待受ポートを8001に固定し、フロントエンドは相対/apiでAPIを呼び出す構成に統一しました。

## Nginx設定例

```nginx
server {
  listen 80;
  server_name _;

  root /home/itoshu/kintai-app/public;
  index index.html;

  location /api/ {
    proxy_pass http://127.0.0.1:8001/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  location / {
    try_files $uri /index.html;
  }
}
```

## 環境変数設定

### バックエンド (ecosystem.config.cjs)
```javascript
env: {
  HOST: "127.0.0.1",
  PORT: "8001",
  NODE_ENV: "production",
  DATA_DIR: "/home/itoshu/kintai-app/data-shadow",
  FRONTEND_PATH: "/home/itoshu/kintai-app/public",
  READ_ONLY: "0",
  BACKUP_ENABLED: "1",
  BACKUP_INTERVAL_MINUTES: "5",
  CORS_ORIGIN: "*"
}
```

### フロントエンド (.env.production)
```
VITE_API_BASE=/api
```

## 起動方法

```bash
# PM2でバックエンド起動
pm2 start ecosystem.config.cjs

# フロントエンドビルド
cd frontend
npm run build
```

## 確認方法

```bash
# バックエンドの待受確認
ss -lntp | grep ':8001'

# 直叩きテスト
curl -sS http://127.0.0.1:8001/api/health

# Nginx経由テスト
curl -sS http://localhost/api/health
```
