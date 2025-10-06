# PowerShell Deploy Script
Write-Host "🚀 PowerShell Deploy Starting..." -ForegroundColor Green
Write-Host "📍 Current directory: $(Get-Location)" -ForegroundColor Cyan
Write-Host "📅 $(Get-Date)" -ForegroundColor Cyan

# 最新コード取得
Write-Host "📥 Fetching latest code..." -ForegroundColor Yellow
git pull origin main
Write-Host "✅ Git pull completed" -ForegroundColor Green

# フロントエンド
Write-Host "🔨 Building frontend..." -ForegroundColor Yellow
Set-Location frontend
Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Cyan
npm install --prefer-offline --no-audit
Write-Host "🏗️ Building frontend..." -ForegroundColor Cyan
npm run build
Write-Host "✅ Frontend build completed" -ForegroundColor Green

# ビルド結果確認
Write-Host "📁 Frontend build output:" -ForegroundColor Cyan
Get-ChildItem dist/
if (-not (Test-Path "dist/index.html")) {
    Write-Host "❌ Frontend build failed: index.html not found in dist/" -ForegroundColor Red
    exit 1
}
Write-Host "📄 index.html exists: $(Get-ChildItem dist/index.html)" -ForegroundColor Green
Set-Location .. # 親ディレクトリに戻る

# バックエンド
Write-Host "🔨 Building backend..." -ForegroundColor Yellow
Set-Location backend
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Cyan
npm install --prefer-offline --no-audit
Write-Host "🏗️ Building backend..." -ForegroundColor Cyan
npm run build
Write-Host "✅ Backend build completed" -ForegroundColor Green

# ビルド結果確認
Write-Host "📁 Backend build output:" -ForegroundColor Cyan
Get-ChildItem dist/
if (-not (Test-Path "dist/index.js")) {
    Write-Host "❌ Backend build failed: index.js not found in dist/" -ForegroundColor Red
    exit 1
}
Write-Host "📄 index.js exists: $(Get-ChildItem dist/index.js)" -ForegroundColor Green
Set-Location .. # 親ディレクトリに戻る

# Publicへ反映
Write-Host "📤 Copying frontend to public directory..." -ForegroundColor Yellow
if (-not (Test-Path "public")) {
    New-Item -ItemType Directory -Name "public"
}
Remove-Item public/* -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path "frontend/dist/*" -Destination "public/" -Recurse -Force
# assetsディレクトリも確実にコピー
if (Test-Path "frontend/dist/assets") {
    if (-not (Test-Path "public/assets")) {
        New-Item -ItemType Directory -Name "public/assets"
    }
    Copy-Item -Path "frontend/dist/assets/*" -Destination "public/assets/" -Recurse -Force
}
Write-Host "✅ Frontend copied to public" -ForegroundColor Green

# コピー結果確認
Write-Host "📁 Public directory contents:" -ForegroundColor Cyan
Get-ChildItem public/
if (-not (Test-Path "public/index.html")) {
    Write-Host "❌ Frontend copy failed: index.html not found in public/" -ForegroundColor Red
    exit 1
}
Write-Host "📄 index.html in public: $(Get-ChildItem public/index.html)" -ForegroundColor Green

Write-Host "✅ Deploy Complete!" -ForegroundColor Green
Write-Host "🌐 Ready for Plio deployment" -ForegroundColor Cyan
Write-Host "📅 Deploy completed at: $(Get-Date)" -ForegroundColor Cyan

