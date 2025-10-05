#!/bin/bash

echo "勤怠管理システム - 開発環境起動スクリプト"
echo "====================================="

echo ""
echo "1. バックエンドを起動しています..."
cd backend
npm run dev &
BACKEND_PID=$!

echo ""
echo "2. 3秒待機中..."
sleep 3

echo ""
echo "3. フロントエンドを起動しています..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "起動完了！"
echo "- フロントエンド: http://localhost:3000"
echo "- バックエンド: http://localhost:4001"
echo ""
echo "両方のサーバーが起動したらブラウザで http://localhost:3000 にアクセスしてください。"
echo ""
echo "終了するには Ctrl+C を押してください。"

# Ctrl+C でプロセスを終了
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT

wait

