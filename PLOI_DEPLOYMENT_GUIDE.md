# 🚀 Plio Deployment Guide for Attendance Management System

## 📋 **概要**

このガイドでは、勤怠管理システムをPlioにデプロイする手順を説明します。

## 🛠️ **必要な準備**

### **1. Plioサーバー要件**
- **OS**: Ubuntu 20.04+ または CentOS 8+
- **Node.js**: 18.x以上
- **PM2**: プロセス管理用
- **Nginx**: リバースプロキシ（オプション）

### **2. 必要なファイル**
- `deploy.sh` - 完全なデプロイスクリプト
- `ploi-simple-deploy.sh` - シンプルなデプロイスクリプト
- `ploi-deploy.yml` - Plio設定ファイル

## 🚀 **デプロイ手順**

### **方法1: シンプルデプロイ（推奨）**

```bash
# 1. リポジトリをクローン
git clone https://github.com/itoshu008/kintai.git
cd kintai

# 2. デプロイスクリプトを実行
chmod +x ploi-simple-deploy.sh
./ploi-simple-deploy.sh
```

### **方法2: 完全デプロイ**

```bash
# 1. リポジトリをクローン
git clone https://github.com/itoshu008/kintai.git
cd kintai

# 2. 完全デプロイスクリプトを実行
chmod +x deploy.sh
./deploy.sh
```

### **方法3: Plio設定ファイル使用**

1. Plioダッシュボードで新しいプロジェクトを作成
2. `ploi-deploy.yml`の内容をPlioの設定に適用
3. 自動デプロイを有効化

## ⚙️ **環境変数設定**

### **必須設定**
```bash
NODE_ENV=production
PORT=8000
LOG_LEVEL=warn
DATA_DIR=/var/lib/attendance/data
FRONTEND_PATH=/var/www/attendance/frontend
```

### **CORS設定**
```bash
# あなたのドメインに変更してください
CORS_ORIGIN=https://your-domain.com,https://www.your-domain.com
```

### **セッション設定**
```bash
SESSION_SECRET=your-secure-session-secret-key
SESSION_TIMEOUT=3600000
```

## 📁 **ディレクトリ構造**

デプロイ後のディレクトリ構造：
```
/var/www/attendance/
├── frontend/          # フロントエンドファイル
│   ├── index.html
│   ├── assets/
│   └── ...
├── backend/           # バックエンドファイル
│   ├── dist/
│   ├── package.json
│   └── node_modules/
└── ...

/var/lib/attendance/
└── data/              # データファイル
    ├── employees.json
    ├── departments.json
    ├── attendance.json
    └── remarks.json

/var/log/attendance/   # ログファイル
```

## 🔧 **プロセス管理**

### **PM2コマンド**
```bash
# アプリケーション開始
pm2 start /var/www/attendance/backend/dist/index.js --name "attendance-app"

# ステータス確認
pm2 status

# ログ確認
pm2 logs attendance-app

# 再起動
pm2 restart attendance-app

# 停止
pm2 stop attendance-app
```

## 🌐 **Nginx設定（オプション）**

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔍 **ヘルスチェック**

デプロイ後、以下のURLでヘルスチェックを実行：

```bash
# ヘルスチェック
curl http://localhost:8000/api/health

# フロントエンド確認
curl http://localhost:8000/

# API確認
curl http://localhost:8000/api/admin/departments
```

## 📊 **監視とログ**

### **ログファイルの場所**
- **アプリケーションログ**: `/var/log/attendance/`
- **PM2ログ**: `pm2 logs attendance-app`
- **Nginxログ**: `/var/log/nginx/`

### **監視コマンド**
```bash
# プロセス監視
pm2 monit

# システムリソース監視
htop

# ディスク使用量確認
df -h
```

## 🔒 **セキュリティ設定**

### **ファイアウォール設定**
```bash
# 必要なポートのみ開放
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw allow 8000  # アプリケーション（必要に応じて）
ufw enable
```

### **ファイル権限設定**
```bash
# 適切な権限設定
chown -R www-data:www-data /var/www/attendance
chown -R www-data:www-data /var/lib/attendance
chmod -R 755 /var/www/attendance
chmod -R 750 /var/lib/attendance
```

## 🚨 **トラブルシューティング**

### **よくある問題**

#### **1. ポートが使用中**
```bash
# プロセス確認
lsof -i :8000

# プロセス終了
kill -9 <PID>
```

#### **2. 権限エラー**
```bash
# 権限修正
sudo chown -R www-data:www-data /var/www/attendance
sudo chmod -R 755 /var/www/attendance
```

#### **3. 依存関係エラー**
```bash
# 依存関係再インストール
cd /var/www/attendance/backend
rm -rf node_modules
npm install --production
```

#### **4. データディレクトリエラー**
```bash
# データディレクトリ作成
sudo mkdir -p /var/lib/attendance/data
sudo chown -R www-data:www-data /var/lib/attendance
```

## 📈 **パフォーマンス最適化**

### **1. PM2設定最適化**
```bash
# クラスタモード（複数CPU使用）
pm2 start dist/index.js --name "attendance-app" -i max
```

### **2. Nginx最適化**
```nginx
# キャッシュ設定
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 🔄 **自動デプロイ設定**

### **GitHub Actions（オプション）**
```yaml
name: Deploy to Plio
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Plio
        run: |
          # Plioデプロイコマンド
          ssh user@your-plio-server "cd /var/www/attendance && git pull && ./ploi-simple-deploy.sh"
```

## 📞 **サポート**

問題が発生した場合：
1. ログファイルを確認
2. ヘルスチェックを実行
3. プロセスステータスを確認
4. 必要に応じて再デプロイ

---

**🎉 デプロイ完了後、アプリケーションは `http://your-domain.com` でアクセス可能になります！**
