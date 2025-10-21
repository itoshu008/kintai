# PM2起動コマンドガイド - 最適化版

## 🚀 最適化されたPM2起動コマンド

### 1. 基本的な起動コマンド（推奨）

```bash
# バックエンドディレクトリに移動
cd backend

# 環境変数を設定
cp env.production .env

# 依存関係をインストール
npm ci --production

# ビルド
npm run build

# PM2設定ファイルで起動（推奨）
pm2 start pm2.config.cjs --env production
```

### 2. 手動起動コマンド

```bash
# 手動でPM2起動（設定ファイルなし）
pm2 start dist/index.js --name kintai-api --env production --instances 2 --exec-mode cluster
```

### 3. 既存プロセスの管理

```bash
# 既存プロセスを停止
pm2 stop kintai-api

# 既存プロセスを削除
pm2 delete kintai-api

# 全プロセスを再起動
pm2 restart all

# 全プロセスを停止
pm2 stop all
```

### 4. ステータス確認

```bash
# PM2プロセス一覧
pm2 status

# ログ確認
pm2 logs kintai-api --lines 20

# 詳細情報
pm2 show kintai-api
```

### 5. ヘルスチェック

```bash
# ローカルヘルスチェック
curl http://localhost:4000/api/admin/health

# 本番ヘルスチェック
curl https://zatint1991.com/api/admin/health
```

### 6. ポート確認

```bash
# ポート4000の使用状況
netstat -an | grep :4000

# または
lsof -i :4000
```

## 🔍 トラブルシューティング

### エラー: Script not found

**原因**: 間違ったファイルパスを指定している

**解決方法**:
```bash
# ❌ 間違い
pm2 start server.js --name kintai-api

# ✅ 正しい
pm2 start dist/index.js --name kintai-api --env production
```

### エラー: Cannot find module

**原因**: 依存関係がインストールされていない

**解決方法**:
```bash
cd backend
npm ci
npm run build
pm2 start dist/index.js --name kintai-api --env production
```

### エラー: Port already in use

**原因**: ポート8001が既に使用されている

**解決方法**:
```bash
# 既存プロセスを停止
pm2 stop kintai-api
pm2 delete kintai-api

# または別のポートを使用
pm2 start dist/index.js --name kintai-api --env production -- --port 8002
```

## 📋 完全なデプロイ手順

```bash
# 1. 最新コードを取得
git fetch origin
git reset --hard origin/main

# 2. バックエンドをセットアップ
cd backend
cp env.production .env
npm ci
npm run build

# 3. PM2で起動
pm2 stop kintai-api 2>/dev/null || true
pm2 delete kintai-api 2>/dev/null || true
pm2 start dist/index.js --name kintai-api --env production

# 4. フロントエンドをセットアップ
cd ../frontend
npm ci
npm run build

# 5. ヘルスチェック
curl http://localhost:4000/api/admin/health
```

## 🎯 期待される結果

**正常な場合**:
```json
{
  "ok": true,
  "status": "healthy",
  "timestamp": "2025-01-09T12:00:00.000Z",
  "version": "1.0.0",
  "environment": "production"
}
```

**PM2ステータス**:
```
┌─────┬─────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id  │ name        │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├─────┼─────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0   │ kintai-api  │ default     │ 1.0.0   │ fork    │ 12345    │ 2m     │ 0    │ online    │ 0%       │ 45.2mb   │ user     │ disabled │
└─────┴─────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
```
