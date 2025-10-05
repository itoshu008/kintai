@echo off
echo 勤怠管理システム - 開発環境起動スクリプト
echo =====================================

echo.
echo 1. バックエンドを起動しています...
start "Backend Server" cmd /k "cd backend && npm run dev"

echo.
echo 2. 3秒待機中...
timeout /t 3 /nobreak >nul

echo.
echo 3. フロントエンドを起動しています...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo 起動完了！
echo - フロントエンド: http://localhost:3000
echo - バックエンド: http://localhost:4001
echo.
echo 両方のサーバーが起動したらブラウザで http://localhost:3000 にアクセスしてください。
pause

