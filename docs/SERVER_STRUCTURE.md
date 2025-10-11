# サーバー構造ドキュメント

## 概要
勤怠管理システムのExpress.jsサーバー設定を整理し、明確な構造にしました。

## サーバー構成

### 1. バックエンドサーバー
**ファイル**: `backend/src/server.ts`
**ビルド後**: `backend/dist/server.js`

- **役割**: メインのAPIサーバー
- **ポート**: 8001 (環境変数 `PORT` で変更可能)
- **ホスト**: 127.0.0.1 (環境変数 `HOST` で変更可能)
- **機能**:
  - 勤怠管理API (`/api/admin/*`, `/api/public/*`)
  - セッション管理
  - 静的ファイル配信（フロントエンド）
  - ヘルスチェック (`/api/health`, `/api/admin/health`)

### 2. フロントエンドサーバー
**ファイル**: `frontend/server.js`

- **役割**: 静的ファイル配信サーバー（開発・テスト用）
- **ポート**: 8001 (環境変数 `PORT` で変更可能)
- **ホスト**: 127.0.0.1 (環境変数 `HOST` で変更可能)
- **機能**:
  - React SPAの静的ファイル配信
  - SPAルーティング対応
  - ヘルスチェック (`/health`)

## PM2設定

### メイン設定ファイル
**ファイル**: `ecosystem.config.js`

```javascript
// バックエンドアプリケーション
{
  name: 'kintai-backend',
  script: './backend/dist/index.js',
  env: {
    NODE_ENV: 'production',
    PORT: 8001,
    HOST: '127.0.0.1',
    TZ: 'Asia/Tokyo'
  }
}

// フロントエンドアプリケーション
{
  name: 'kintai-frontend',
  script: './frontend/server.js',
  env: {
    NODE_ENV: 'production',
    PORT: 8001,
    HOST: '127.0.0.1',
    TZ: 'Asia/Tokyo'
  }
}
```

## 起動方法

### 開発環境
```bash
# バックエンド
cd backend
npm run dev

# フロントエンド
cd frontend
npm run dev
```

### 本番環境
```bash
# PM2で起動
pm2 start ecosystem.config.js

# 個別起動
pm2 start backend/dist/index.js --name kintai-backend
pm2 start frontend/server.js --name kintai-frontend
```

## 削除されたファイル

以下の重複・不要ファイルを削除しました：

1. `backend/server.ts` - `backend/src/server.ts` と重複
2. `api-server.js` - 古いAPIサーバー（機能重複）
3. `ecosystem.config.cjs` - 重複するPM2設定
4. `backend/ecosystem.config.cjs` - 重複するPM2設定

## 環境変数

### バックエンド
- `PORT`: サーバーポート (デフォルト: 8001)
- `HOST`: サーバーホスト (デフォルト: 127.0.0.1)
- `NODE_ENV`: 環境 (production/development)
- `TZ`: タイムゾーン (デフォルト: Asia/Tokyo)

### フロントエンド
- `PORT`: サーバーポート (デフォルト: 8001)
- `HOST`: サーバーホスト (デフォルト: 127.0.0.1)
- `NODE_ENV`: 環境 (production/development)

## ヘルスチェック

### バックエンド
- `GET /api/health` - 基本ヘルスチェック
- `GET /api/admin/health` - 管理者用ヘルスチェック

### フロントエンド
- `GET /health` - フロントエンドヘルスチェック

## ログファイル

PM2により以下のログファイルが生成されます：

- `./logs/backend-error.log` - バックエンドエラーログ
- `./logs/backend-out.log` - バックエンド出力ログ
- `./logs/backend-combined.log` - バックエンド統合ログ
- `./logs/frontend-error.log` - フロントエンドエラーログ
- `./logs/frontend-out.log` - フロントエンド出力ログ
- `./logs/frontend-combined.log` - フロントエンド統合ログ

## デプロイメント

デプロイスクリプトは以下のファイルを参照：
- `deploy-complete.sh` - 完全デプロイスクリプト
- `deploy-complete.ps1` - PowerShell版デプロイスクリプト
- `deploy-simple-fixed.ps1` - シンプルデプロイスクリプト

すべてのスクリプトは `backend/dist/index.js` を使用してバックエンドを起動します。
