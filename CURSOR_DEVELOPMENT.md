# Cursor開発環境セットアップガイド

## 概要
このプロジェクトはCursor開発環境に対応しており、TypeScriptビルドとバックエンドプロセス管理を自動化できます。

## 前提条件
- Node.js (v18以上)
- npm
- PM2 (グローバルインストール)
- PowerShell (Windows)

## セットアップ

### 1. 依存関係のインストール
```bash
npm install
```

### 2. プロジェクトビルド
```bash
npm run build
```

### 3. バックエンド起動
```bash
pm2 start backend-pm2.config.js
```

## Cursor開発コマンド

### 基本コマンド
```bash
# 開発環境セットアップ（ビルド + 起動 + ヘルスチェック）
npm run cursor:dev

# プロジェクト全体をビルド
npm run cursor:build

# バックエンドを起動
npm run cursor:start

# バックエンドを再起動
npm run cursor:restart

# バックエンドを停止
npm run cursor:stop

# バックエンドログを表示
npm run cursor:logs

# PM2ステータス確認
npm run cursor:status

# ヘルスチェック実行
npm run cursor:health

# クリーンアップ（dist削除 + PM2停止）
npm run cursor:clean
```

### 個別ビルドコマンド
```bash
# フロントエンドのみビルド
npm run build:frontend

# バックエンドのみビルド
npm run build:backend
```

## VSCode統合

### タスク実行
Ctrl+Shift+P → "Tasks: Run Task" で以下のタスクを実行可能：
- Build Frontend
- Build Backend
- Build All
- Start Backend (PM2)
- Stop Backend (PM2)
- Restart Backend (PM2)
- Health Check

### 設定ファイル
- `.vscode/settings.json`: TypeScript開発環境の最適化設定
- `.vscode/tasks.json`: ビルド・デプロイタスクの定義

## プロジェクト構造

```
kintai-clone/
├── frontend/          # React + TypeScript フロントエンド
│   ├── src/
│   ├── dist/          # ビルド成果物
│   └── package.json
├── backend/           # Node.js + TypeScript バックエンド
│   ├── src/
│   ├── dist/          # ビルド成果物
│   └── package.json
├── cursor.yml         # Cursor設定ファイル
├── cursor-dev.ps1     # PowerShell開発スクリプト
├── backend-pm2.config.js  # PM2設定ファイル
└── package.json       # ワークスペース設定
```

## API エンドポイント

### ヘルスチェック
- `GET /api/admin/health` - 管理者用ヘルスチェック
- `GET /api/health` - 基本ヘルスチェック

### 主要API
- `GET /api/admin/departments` - 部署一覧
- `GET /api/admin/employees` - 社員一覧
- `GET /api/admin/master` - 勤怠マスター表示
- `POST /api/public/clock-in` - 出勤打刻
- `POST /api/public/clock-out` - 退勤打刻

### バックアップAPI
- `POST /api/admin/backup` - バックアップ作成
- `GET /api/admin/backups` - バックアップ一覧
- `GET /api/admin/backups/:id` - バックアップ詳細
- `GET /api/admin/backups/:id/preview` - バックアッププレビュー
- `POST /api/admin/backups/:id/restore` - バックアップ復元
- `DELETE /api/admin/backups/:id` - バックアップ削除
- `POST /api/admin/backups/cleanup` - 古いバックアップ削除

## トラブルシューティング

### PowerShell実行ポリシーエラー
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
```

### PM2プロセス管理
```bash
# プロセス一覧
pm2 list

# ログ確認
pm2 logs kintai-backend

# プロセス停止
pm2 stop kintai-backend

# プロセス削除
pm2 delete kintai-backend
```

### ポート競合
バックエンドは8001番ポートを使用します。他のプロセスが使用している場合は停止してください。

## 開発ワークフロー

1. **コード編集**: TypeScriptファイルを編集
2. **ビルド**: `npm run cursor:build` でビルド
3. **起動**: `npm run cursor:start` でバックエンド起動
4. **テスト**: `npm run cursor:health` でヘルスチェック
5. **デバッグ**: `npm run cursor:logs` でログ確認

## 注意事項

- フロントエンドは `http://localhost:8001` でアクセス
- バックエンドAPIは `http://localhost:8001/api/` でアクセス
- PM2プロセスは `kintai-backend` という名前で管理
- 本番環境では環境変数ファイル（`.env`）を適切に設定