# 環境設定ファイル（.env）の作成手順

## 概要
このプロジェクトでは、環境変数を使用して設定を管理しています。`.env`ファイルを作成して、必要な設定値を設定してください。

## 手順

### 1. .envファイルの作成
`backend`ディレクトリに`.env`ファイルを作成してください：

```bash
cd backend
cp env.example .env
```

### 2. 設定値の編集
`.env`ファイルを開いて、以下の値を環境に合わせて編集してください：

```env
# データベース設定（ローカルMariaDB）
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=attendance

# サーバー設定
HOST=127.0.0.1
PORT=8001
NODE_ENV=development

# データディレクトリ設定
DATA_DIR=./data

# ログレベル設定 (debug, info, warn, error)
LOG_LEVEL=info

# CORS設定（カンマ区切りで複数指定可能）
CORS_ORIGIN=http://localhost:8001,http://127.0.0.1:8001

# タイムゾーン
TZ=Asia/Tokyo

# セッション設定
SESSION_SECRET=your-session-secret-key-change-this-in-production
SESSION_TIMEOUT=3600000

# バックアップ設定
BACKUP_ENABLED=1
BACKUP_INTERVAL_MINUTES=60
BACKUP_MAX_KEEP=24

# Cursor指示システム認証トークン（オプション）
CURSOR_AUTH_TOKEN=admin123
```

### 3. 重要な設定項目

#### データベース設定
- `DB_HOST`: データベースサーバーのホスト（通常は`127.0.0.1`）
- `DB_PORT`: データベースのポート（MariaDB/MySQLの場合は`3306`）
- `DB_USER`: データベースのユーザー名
- `DB_PASSWORD`: データベースのパスワード
- `DB_NAME`: 使用するデータベース名

#### サーバー設定
- `HOST`: サーバーのホスト（通常は`127.0.0.1`）
- `PORT`: サーバーのポート（現在は`8001`に設定）
- `NODE_ENV`: 実行環境（`development`または`production`）

#### セキュリティ設定
- `SESSION_SECRET`: セッション暗号化用の秘密鍵（本番環境では必ず変更）
- `CURSOR_AUTH_TOKEN`: Cursor指示システム用の認証トークン（オプション）

### 4. 本番環境での注意事項
- `SESSION_SECRET`は必ず強力なランダム文字列に変更してください
- `DB_PASSWORD`は安全なパスワードに設定してください
- `NODE_ENV`を`production`に設定してください
- 機密情報は`.env`ファイルに保存し、Gitにコミットしないでください

### 5. トラブルシューティング
- `.env`ファイルが正しく読み込まれない場合は、ファイルの文字エンコーディングがUTF-8であることを確認してください
- 設定値にスペースが含まれる場合は、値をクォートで囲んでください
- コメント行は`#`で始めてください

## 例：Windows環境での作成
```cmd
cd backend
copy env.example .env
notepad .env
```

## 例：Linux/macOS環境での作成
```bash
cd backend
cp env.example .env
nano .env
```
