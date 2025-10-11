# 🔐 GitHub Secrets設定ガイド

## 📋 必要なSecrets一覧

### 基本的なSecrets

| Secret名 | 説明 | 例 |
|---------|------|-----|
| `SSH_PRIVATE_KEY` | サーバーへのSSH接続用秘密鍵 | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `SSH_HOST` | サーバーのIPアドレスまたはドメイン | `zatint1991.com` |
| `SSH_USER` | SSH接続ユーザー名 | `zatint1991-hvt55` |
| `DEPLOY_PATH` | プロダクション環境のデプロイ先パス | `/home/zatint1991-hvt55/zatint1991.com` |
| `STAGING_DEPLOY_PATH` | ステージング環境のデプロイ先パス | `/home/zatint1991-hvt55/staging.zatint1991.com` |
| `BACKUP_PATH` | バックアップ保存先パス | `/home/zatint1991-hvt55/backups` |

### 環境別Secrets

#### プロダクション環境
| Secret名 | 説明 | 例 |
|---------|------|-----|
| `PROD_DB_HOST` | プロダクションDBホスト | `localhost` |
| `PROD_DB_USER` | プロダクションDBユーザー | `attendance_user` |
| `PROD_DB_PASSWORD` | プロダクションDBパスワード | `secure_password` |
| `PROD_DB_NAME` | プロダクションDB名 | `attendance_prod` |

#### ステージング環境
| Secret名 | 説明 | 例 |
|---------|------|-----|
| `STAGING_DB_HOST` | ステージングDBホスト | `localhost` |
| `STAGING_DB_USER` | ステージングDBユーザー | `attendance_staging` |
| `STAGING_DB_PASSWORD` | ステージングDBパスワード | `staging_password` |
| `STAGING_DB_NAME` | ステージングDB名 | `attendance_staging` |

## 🔧 Secrets設定手順

### 1. GitHubリポジトリでSecretsを設定

1. GitHubリポジトリにアクセス
2. `Settings` → `Secrets and variables` → `Actions`
3. `New repository secret` をクリック
4. 上記の表に従って各Secretを追加

### 2. SSH鍵の生成と設定

```bash
# SSH鍵ペアを生成
ssh-keygen -t rsa -b 4096 -C "github-actions@zatint1991.com"

# 公開鍵をサーバーに追加
ssh-copy-id -i ~/.ssh/id_rsa.pub zatint1991-hvt55@zatint1991.com

# 秘密鍵をGitHub Secretsに追加
cat ~/.ssh/id_rsa
# 出力された内容をSSH_PRIVATE_KEYとして設定
```

### 3. 環境変数ファイルの設定

#### プロダクション環境 (.env.production)
```bash
# データベース設定
DB_HOST=localhost
DB_PORT=3306
DB_USER=attendance_user
DB_PASSWORD=secure_password
DB_NAME=attendance_prod

# サーバー設定
PORT=8000
NODE_ENV=production

# データディレクトリ設定
DATA_DIR=/home/zatint1991-hvt55/zatint1991.com/data

# バックアップ設定
BACKUP_ENABLED=1
BACKUP_INTERVAL_MINUTES=60
BACKUP_MAX_KEEP=24
```

#### ステージング環境 (.env.staging)
```bash
# データベース設定
DB_HOST=localhost
DB_PORT=3306
DB_USER=attendance_staging
DB_PASSWORD=staging_password
DB_NAME=attendance_staging

# サーバー設定
PORT=8001
NODE_ENV=staging

# データディレクトリ設定
DATA_DIR=/home/zatint1991-hvt55/staging.zatint1991.com/data

# バックアップ設定
BACKUP_ENABLED=1
BACKUP_INTERVAL_MINUTES=30
BACKUP_MAX_KEEP=10
```

## 🚀 デプロイ設定の確認

### 1. 環境の設定確認

GitHubリポジトリで以下を設定：

1. `Settings` → `Environments`
2. `New environment` で以下を作成：
   - `staging`
   - `production`

### 2. 環境別の保護ルール設定

#### プロダクション環境
- `Required reviewers`: 1人以上
- `Wait timer`: 5分
- `Deployment branches`: `main` のみ

#### ステージング環境
- `Required reviewers`: なし
- `Wait timer`: 0分
- `Deployment branches`: `staging` のみ

## 🔍 トラブルシューティング

### よくある問題

1. **SSH接続エラー**
   ```bash
   # SSH接続をテスト
   ssh -i ~/.ssh/id_rsa zatint1991-hvt55@zatint1991.com
   ```

2. **権限エラー**
   ```bash
   # サーバーで権限を確認
   ls -la /home/zatint1991-hvt55/zatint1991.com
   chmod +x /home/zatint1991-hvt55/zatint1991.com/backend/dist/index.js
   ```

3. **PM2プロセスエラー**
   ```bash
   # PM2の状態を確認
   pm2 status
   pm2 logs
   ```

### デバッグ方法

1. **GitHub Actionsログを確認**
   - リポジトリの `Actions` タブ
   - 失敗したワークフローをクリック
   - 各ステップのログを確認

2. **サーバーでログを確認**
   ```bash
   # PM2ログ
   pm2 logs --lines 50
   
   # システムログ
   tail -f /var/log/nginx/error.log
   ```

## 📊 監視設定

### 1. ヘルスチェックエンドポイント

```bash
# プロダクション
curl http://zatint1991.com:8000/api/admin/backups/health

# ステージング
curl http://staging.zatint1991.com:8001/api/admin/backups/health
```

### 2. 通知設定

SlackやEmailでの通知を設定する場合：

```yaml
# .github/workflows/notify.yml
- name: Slack notification
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    channel: '#deployments'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## 🎯 次のステップ

1. 上記のSecretsをGitHubリポジトリに設定
2. SSH鍵を生成してサーバーに設定
3. 環境変数ファイルを作成
4. GitHub Actionsワークフローをテスト
5. デプロイの動作確認

**これで完全なCI/CDパイプラインが構築されます！** 🚀
