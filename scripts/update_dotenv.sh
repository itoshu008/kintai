#!/bin/bash
# リポジトリ側で（ローカル or VPS の作業コピー）
cd backend

# dotenv を prod 依存で追加（lock を更新）
npm install dotenv@^16.6.1 --save

# 動作確認（任意）
npm run build

# 変更をコミット & プッシュ（CI で npm ci が通るようになる）
git add package.json package-lock.json
git commit -m "chore(backend): add dotenv as prod dep (lock updated)"
git push
