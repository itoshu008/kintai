# attendance-backend (Windows + Node v22)

## セットアップ
1. `cp .env.example .env` して値を入れる
2. MySQL に `sql/schema.sql` を流す（例：MySQL Workbench / CLI）
3. `npm ci`（または `npm i`）
4. `npm run build`
5. `npm start`（落ちたら `npm run diagnose` で詳細ログ）

## ヘルスチェック
GET http://127.0.0.1:4001/api/health → `{ ok: true }`
