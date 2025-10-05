# 勤怠アプリ

50名規模の勤怠管理システム

## 構成

- **Backend**: Node.js + Express + TypeScript + MySQL
- **Frontend**: React + Vite + TypeScript
- **DB**: MySQL/MariaDB
- **開発環境**: モック機能付きでバックエンド不要でのUI開発が可能

## 機能

### 1. 個別打刻ページ (`/p/:token`)
- 出勤・退勤ボタン（スマホ想定、QRで開ける）
- 最新の打刻状態表示

### 2. 管理画面
- `/admin/master?date=YYYY-MM-DD`: 全員の日次一覧
- `/admin/weekly?start=YYYY-MM-DD`: 週次合算

## セットアップ

### 前提条件
- Node.js 18+
- MySQL 8.0+
- npm または yarn

### インストール

```bash
# 依存関係のインストール
npm install

# セットアップスクリプト実行
npm run setup
```

### 環境変数設定

#### Backend (.env)
```env
# データベース設定
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=attendance_user
DB_PASSWORD=strongpass
DB_NAME=attendance

# サーバー設定
PORT=4021
NODE_ENV=development

# ログ設定
LOG_LEVEL=DEBUG

# タイムゾーン
TZ=Asia/Tokyo
```

#### Frontend (.env)
```env
# API設定
VITE_ATTENDANCE_API_BASE=http://127.0.0.1:4021/api/admin
VITE_SCHEDULE_API_BASE=http://127.0.0.1:4001/api

# 開発設定（モック機能）
VITE_USE_MOCK=1
NODE_ENV=development
```

### 起動

```bash
# 開発環境（両方同時起動）
npm run dev

# 個別起動
npm run dev:backend   # Backend: http://localhost:4021
npm run dev:frontend  # Frontend: http://localhost:5173
```

### 本番ビルド

```bash
npm run build
npm start
```

## API仕様

### ヘルスチェック
- `GET /api/health` → `{ok: true}`

### 社員管理
- `GET /api/employees` → 社員一覧

### 打刻（公開）
- `GET /api/public/profile/:token` → 社員情報
- `POST /api/public/clock-in` → 出勤打刻
- `POST /api/public/clock-out` → 退勤打刻

### レポート
- `GET /api/reports/daily?date=YYYY-MM-DD` → 日次レポート
- `GET /api/reports/weekly?start=YYYY-MM-DD` → 週次レポート

## サンプルデータ

初期データとして5名のサンプル社員が投入されます：

| 社員コード | 氏名 | 部署 | 個別打刻URL |
|-----------|------|------|-------------|
| EMP001 | 田中太郎 | 営業部 | `/p/EMP001` |
| EMP002 | 佐藤花子 | 営業部 | `/p/EMP002` |
| EMP003 | 鈴木一郎 | 開発部 | `/p/EMP003` |
| EMP004 | 高橋美咲 | 開発部 | `/p/EMP004` |
| EMP005 | 山田次郎 | 総務部 | `/p/EMP005` |

各社員の `code` がトークンとして使用できます。

## 拡張予定

- リアルタイム更新（Socket.IO）
- CSVエクスポート
- PWA対応
- 仮想スクロール
