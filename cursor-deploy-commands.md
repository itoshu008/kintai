# 🚀 Cursor用デプロイコマンド集

## 📋 基本的なデプロイコマンド

### 1. 完全デプロイ
```bash
# Cursorに指示
"GitHubリポジトリから最新コードを取得して、サーバーに完全デプロイしてください。手順：git pull → npm install → npm run build → pm2 restart all"

# 実行コマンド
git pull origin main
npm ci
cd backend && npm ci && npm run build && cd ..
cd frontend && npm ci && npm run build && cd ..
pm2 restart all
```

### 2. バックエンドのみデプロイ
```bash
# Cursorに指示
"バックエンドのみをデプロイしてください。APIの変更を反映します。"

# 実行コマンド
cd backend
git pull origin main
npm ci
npm run build
pm2 restart kintai-backend
```

### 3. フロントエンドのみデプロイ
```bash
# Cursorに指示
"フロントエンドのみをデプロイしてください。UIの変更を反映します。"

# 実行コマンド
cd frontend
git pull origin main
npm ci
npm run build
# Nginxの再読み込みが必要な場合
sudo nginx -t && sudo systemctl reload nginx
```

## 🔧 環境設定コマンド

### 1. 環境変数設定
```bash
# Cursorに指示
"本番環境の設定を適用してください。"

# 実行コマンド
cp backend/env.production backend/.env
export NODE_ENV=production
export PORT=8001
```

### 2. データベース設定
```bash
# Cursorに指示
"データベースの設定を確認・更新してください。"

# 実行コマンド
# MySQL/MariaDBの場合
mysql -u root -p -e "SHOW DATABASES;"
mysql -u root -p -e "USE attendance; SHOW TABLES;"
```

### 3. Nginx設定
```bash
# Cursorに指示
"Nginxの設定を確認・更新してください。"

# 実行コマンド
sudo nginx -t
sudo systemctl status nginx
sudo systemctl reload nginx
```

## 🚨 トラブルシューティングコマンド

### 1. ログ確認
```bash
# Cursorに指示
"アプリケーションのログを確認してください。"

# 実行コマンド
pm2 logs --lines 50
pm2 logs kintai-backend --lines 20
tail -f /var/log/nginx/error.log
```

### 2. プロセス状態確認
```bash
# Cursorに指示
"プロセスの状態を確認してください。"

# 実行コマンド
pm2 status
ps aux | grep node
netstat -tlnp | grep 8001
```

### 3. ディスク容量確認
```bash
# Cursorに指示
"ディスク容量とメモリ使用量を確認してください。"

# 実行コマンド
df -h
free -h
du -sh /home/zatint1991-hvt55/zatint1991.com
```

## 🔄 ロールバックコマンド

### 1. 前のバージョンに戻す
```bash
# Cursorに指示
"前のバージョンにロールバックしてください。"

# 実行コマンド
git log --oneline -5
git reset --hard HEAD~1
npm ci
npm run build
pm2 restart all
```

### 2. バックアップから復元
```bash
# Cursorに指示
"バックアップから復元してください。"

# 実行コマンド
ls -la /home/zatint1991-hvt55/backups/
cp -r /home/zatint1991-hvt55/backups/backup_YYYYMMDD_HHMMSS/* /home/zatint1991-hvt55/zatint1991.com/
pm2 restart all
```

## 📊 ヘルスチェックコマンド

### 1. APIヘルスチェック
```bash
# Cursorに指示
"APIのヘルスチェックを実行してください。"

# 実行コマンド
curl http://localhost:8001/api/admin/backups/health
curl http://localhost:8001/api/admin/departments
curl -I http://localhost:8001/api/admin/employees
```

### 2. フロントエンドチェック
```bash
# Cursorに指示
"フロントエンドの動作を確認してください。"

# 実行コマンド
curl -I http://localhost:8001
curl -I https://zatint1991.com
```

### 3. データベースチェック
```bash
# Cursorに指示
"データベースの接続を確認してください。"

# 実行コマンド
mysql -u root -p -e "SELECT 1;"
# または
psql -h localhost -U postgres -c "SELECT 1;"
```

## 🔧 メンテナンスコマンド

### 1. ログローテーション
```bash
# Cursorに指示
"ログファイルをローテーションしてください。"

# 実行コマンド
pm2 flush
sudo logrotate -f /etc/logrotate.d/nginx
```

### 2. 古いファイルのクリーンアップ
```bash
# Cursorに指示
"古いファイルをクリーンアップしてください。"

# 実行コマンド
find /home/zatint1991-hvt55/backups -name "backup_*" -mtime +7 -exec rm -rf {} \;
npm cache clean --force
```

### 3. セキュリティ更新
```bash
# Cursorに指示
"セキュリティ更新を実行してください。"

# 実行コマンド
sudo apt update
sudo apt upgrade -y
npm audit fix
```

## 🚀 自動化コマンド

### 1. 定期バックアップ
```bash
# Cursorに指示
"定期バックアップを設定してください。"

# 実行コマンド
# crontabに追加
echo "0 2 * * * /home/zatint1991-hvt55/zatint1991.com/backup-script.sh" | crontab -
```

### 2. 自動デプロイ設定
```bash
# Cursorに指示
"GitHub Webhookで自動デプロイを設定してください。"

# 実行コマンド
# webhookエンドポイントを作成
# GitHubリポジトリのSettings > Webhooksで設定
```

## 💡 カスタムコマンド

### 1. 特定の機能テスト
```bash
# Cursorに指示
"バックアップ機能をテストしてください。"

# 実行コマンド
curl -X POST http://localhost:8001/api/admin/backup \
  -H "Content-Type: application/json" \
  -d '{"reason": "test"}'
```

### 2. パフォーマンステスト
```bash
# Cursorに指示
"APIのパフォーマンスをテストしてください。"

# 実行コマンド
ab -n 100 -c 10 http://localhost:8001/api/admin/departments
```

---

## 🎯 使用方法

1. 上記のコマンドをCursorのチャットにコピー&ペースト
2. 必要に応じてパスや設定を調整
3. Cursorが自動でコマンドを実行
4. 結果を確認して必要に応じて修正

**これでCursorを使った効率的なデプロイ管理が可能になります！** 🚀
