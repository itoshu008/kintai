# 勤怠管理システム

## 概要
スマートフォン・PC対応の勤怠管理システムです。

## 主要機能
- 社員の出退勤管理
- 部署管理
- 勤怠データの集計・表示
- 60分間隔の自動バックアップ

## 技術スタック
- **フロントエンド**: React + TypeScript + Vite
- **バックエンド**: Node.js + Express + TypeScript
- **データ保存**: JSON ファイル
- **プロセス管理**: PM2

## ディレクトリ構成
```
kintai/
├── frontend/          # フロントエンド（React）
├── backend/           # バックエンド（Node.js）
├── public/            # 静的ファイル（ビルド後）
├── data/              # データファイル（JSON）
└── backups/           # バックアップファイル
```

## デプロイ方法

### 1. 最新コード取得
```bash
git pull origin main
```

### 2. フロントエンドビルド
```bash
cd frontend
npm install
npm run build
cd ..
```

### 3. バックエンドビルド
```bash
cd backend
npm install
npm run build
cd ..
```

### 4. 静的ファイルコピー
```bash
mkdir -p public
cp -r frontend/dist/* public/
```

### 5. PM2で起動
```bash
cd backend
pm2 start dist/index.js --name "attendance-app" --env production \
  --env PORT=8001 \
  --env NODE_ENV=production \
  --env DATA_DIR="/home/zatint1991-hvt55/zatint1991.com/data" \
  --env FRONTEND_PATH="/home/zatint1991-hvt55/zatint1991.com/public" \
  --env LOG_LEVEL=info \
  --env CORS_ORIGIN="https://zatint1991.com,https://www.zatint1991.com"
pm2 save
```

## 環境変数
- `PORT`: サーバーポート（デフォルト: 8001）
- `NODE_ENV`: 環境（production/development）
- `DATA_DIR`: データディレクトリパス
- `FRONTEND_PATH`: フロントエンドファイルパス
- `LOG_LEVEL`: ログレベル（info/debug/warn/error）
- `CORS_ORIGIN`: CORS許可オリジン

## バックアップシステム
- バックアップ間隔: 60分（1時間）
- 最大バックアップ数: 24個（24時間分）
- バックアップディレクトリ: `backups/`
- 変更時のみバックアップ実行（ディスク節約）

## アクセス
- アプリケーション: https://zatint1991.com
- マスターページ: https://zatint1991.com/admin-dashboard-2024
- パーソナルページ: https://zatint1991.com/personal

## メンテナンス
- PM2ステータス確認: `pm2 status`
- ログ確認: `pm2 logs attendance-app`
- プロセス再起動: `pm2 restart attendance-app`