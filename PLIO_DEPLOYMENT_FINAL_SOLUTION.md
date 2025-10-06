# 🚀 Plioデプロイ最終解決策

## 🔍 問題の根本原因

1. **権限問題**: `node_modules` の権限が不適切
2. **依存関係問題**: 開発依存関係がインストールされない
3. **スクリプト問題**: 権限エラーを回避する仕組みがない

## ✅ 完全解決手順

### ステップ1: 権限を完全に修正

```bash
# 1. 権限修正スクリプトをダウンロード
cd /home/zatint1991-hvt55/zatint1991.com
git pull origin main

# 2. 権限修正スクリプトを実行
chmod +x fix-permissions.sh
./fix-permissions.sh
```

### ステップ2: 新しいデプロイスクリプトを実行

```bash
# 3. 新しいデプロイスクリプトを実行
chmod +x ploi-final-deploy.sh
./ploi-final-deploy.sh
```

### ステップ3: Plioダッシュボードの設定

**Plioダッシュボードで以下を設定：**

- **Deploy Script**: `ploi-final-deploy.sh`
- **自動デプロイ**: 有効にする

## 🔧 新しいスクリプトの特徴

### `ploi-final-deploy.sh` の改善点

1. **権限問題回避**:
   - `node_modules` が既に存在する場合はスキップ
   - `--no-audit --no-fund` で権限エラーを回避

2. **依存関係問題解決**:
   - 開発依存関係も含めてインストール
   - `--prefer-offline` で高速化

3. **エラーハンドリング強化**:
   - 各ステップでエラーチェック
   - 失敗時は即座に停止

4. **詳細ログ**:
   - 各ステップの進行状況を表示
   - ヘルスチェック機能

## 📋 手動デプロイ（緊急時）

もし自動デプロイが失敗した場合：

```bash
# 1. 権限修正
sudo chown -R zatint1991-hvt55:zatint1991-hvt55 /home/zatint1991-hvt55/zatint1991.com
chmod -R 755 /home/zatint1991-hvt55/zatint1991.com
sudo rm -rf /home/zatint1991-hvt55/zatint1991.com/node_modules
sudo rm -rf /home/zatint1991-hvt55/zatint1991.com/frontend/node_modules
sudo rm -rf /home/zatint1991-hvt55/zatint1991.com/backend/node_modules

# 2. フロントエンドデプロイ
cd /home/zatint1991-hvt55/zatint1991.com/frontend
npm install --no-audit --no-fund
npm run build

# 3. バックエンドデプロイ
cd ../backend
npm install --no-audit --no-fund
npm run build

# 4. フロントエンドをpublicにコピー
cd ..
mkdir -p public
rm -rf public/*
cp -r frontend/dist/* public/

# 5. データディレクトリの準備
mkdir -p data
chmod 755 data

# 6. PM2でアプリケーション起動
cd backend
pm2 stop all
pm2 delete all
pm2 start dist/index.js --name "attendance-app" --env production \
  --env PORT=8000 \
  --env NODE_ENV=production \
  --env DATA_DIR="/home/zatint1991-hvt55/zatint1991.com/data" \
  --env FRONTEND_PATH="/home/zatint1991-hvt55/zatint1991.com/public" \
  --env LOG_LEVEL=info \
  --env CORS_ORIGIN="https://zatint1991.com,https://www.zatint1991.com"

# 7. PM2設定保存
pm2 save

# 8. ヘルスチェック
curl http://localhost:8000/api/health
```

## 🎯 期待される結果

- ✅ 権限エラーが発生しない
- ✅ TypeScriptビルドが成功する
- ✅ PM2プロセスが正常に起動する
- ✅ アプリケーションがアクセス可能になる

## 📝 トラブルシューティング

### もし権限エラーが再発した場合

```bash
# 権限を再修正
sudo chown -R zatint1991-hvt55:zatint1991-hvt55 /home/zatint1991-hvt55/zatint1991.com
chmod -R 755 /home/zatint1991-hvt55/zatint1991.com
```

### もしPM2プロセスが起動しない場合

```bash
# PM2ログを確認
pm2 logs attendance-app

# ポート8000の使用状況を確認
sudo netstat -tlnp | grep :8000
```

## 🚀 完了

この手順により、Plioでの自動デプロイが正常に動作するようになります。

---

**最終更新日**: 2025-10-05  
**ステータス**: ✅ 完全解決策提供  
**推奨**: `ploi-final-deploy.sh` を使用

