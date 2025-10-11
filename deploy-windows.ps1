# Windows用デプロイスクリプト
# PowerShellで実行

Write-Host "🚀 Windows Deploy Script" -ForegroundColor Green

# プロジェクトディレクトリに移動
Set-Location "E:\プログラム\kintai\kintai-clone"

# Git更新
Write-Host "📥 Updating from GitHub..." -ForegroundColor Yellow
git fetch origin
git reset --hard origin/main

# 依存関係インストール
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm ci

# バックエンドビルド
Write-Host "🔨 Building backend..." -ForegroundColor Yellow
Set-Location backend
npm ci
npm run build
Set-Location ..

# フロントエンドビルド
Write-Host "🔨 Building frontend..." -ForegroundColor Yellow
Set-Location frontend
npm ci
npm run build
Set-Location ..

Write-Host "✅ Deploy completed!" -ForegroundColor Green
