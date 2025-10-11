# 🚀 デプロイガイド

このプロジェクトのデプロイ方法を説明します。

## 📋 前提条件

- Node.js 18以上
- Git
- PM2 (本番環境)
- Nginx (本番環境)

## 🔧 デプロイスクリプト

### 1. 本格版デプロイスクリプト (推奨)

```bash
# サーバーで実行
./deploy-ploi.sh
```

**機能:**
- ✅ 自動バックアップ作成
- ✅ エラーハンドリング
- ✅ ヘルスチェック
- ✅ ログ出力
- ✅ 古いバックアップクリーンアップ

### 2. 簡易版デプロイスクリプト

```bash
# サーバーで実行
./deploy-simple.sh
```

**機能:**
- ✅ 基本的なデプロイ手順
- ✅ 軽量で高速

### 3. Windows用デプロイスクリプト

```powershell
# PowerShellで実行
.\deploy-windows.ps1
```

**機能:**
- ✅ Windows環境用
- ✅ PowerShell対応

## 🛠️ 手動デプロイ手順

### 1. コードの更新

```bash
# プロジェクトディレクトリに移動
cd /home/zatint1991-hvt55/zatint1991.com

# 最新コードを取得
git fetch origin
git reset --hard origin/main
```

### 2. 依存関係のインストール

```bash
# ルートの依存関係
npm ci

# バックエンドの依存関係
cd backend
npm ci
cd ..

# フロントエンドの依存関係
cd frontend
npm ci
cd ..
```

### 3. ビルド実行

```bash
# バックエンドビルド
cd backend
npm run build
cd ..

# フロントエンドビルド
cd frontend
npm run build
cd ..
```

### 4. プロセス再起動

```bash
# PM2で再起動
pm2 restart all

# または個別に再起動
pm2 restart kintai-backend
```

## 🔍 デプロイ後の確認

### 1. ヘルスチェック

```bash
# バックエンドのヘルスチェック
curl http://localhost:8000/api/admin/backups/health

# フロントエンドの確認
curl http://localhost:3000
```

### 2. ログ確認

```bash
# PM2のログ確認
pm2 logs

# 特定のプロセスのログ
pm2 logs kintai-backend
```

### 3. プロセス状態確認

```bash
# PM2の状態確認
pm2 status

# 詳細情報
pm2 show kintai-backend
```

## ⚙️ 環境設定

### 本番環境設定

```bash
# 環境変数ファイルをコピー
cp backend/env.production backend/.env

# 必要に応じて編集
nano backend/.env
```

### Nginx設定例

```nginx
server {
    listen 80;
    server_name zatint1991.com;

    # フロントエンド
    location / {
        root /home/zatint1991-hvt55/zatint1991.com/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # バックエンドAPI
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🚨 トラブルシューティング

### よくある問題

1. **ビルドエラー**
   ```bash
   # 依存関係をクリーンインストール
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **PM2プロセスが起動しない**
   ```bash
   # PM2をリセット
   pm2 delete all
   pm2 start backend/dist/index.js --name "kintai-backend"
   ```

3. **権限エラー**
   ```bash
   # 権限を修正
   chmod +x backend/dist/index.js
   chmod -R 755 frontend/dist
   ```

### ログの場所

- **PM2ログ**: `~/.pm2/logs/`
- **Nginxログ**: `/var/log/nginx/`
- **アプリケーションログ**: コンソール出力

## 📞 サポート

問題が発生した場合は、以下を確認してください：

1. ログファイルの内容
2. プロセスの状態
3. ネットワーク接続
4. ディスク容量

---

**🎉 デプロイが完了したら、アプリケーションが正常に動作することを確認してください！**
