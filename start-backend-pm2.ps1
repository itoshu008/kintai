# バックエンドPM2起動スクリプト
# PowerShell用

Write-Host "🚀 バックエンドPM2起動スクリプト開始" -ForegroundColor Green

# 現在のディレクトリを確認
$currentDir = Get-Location
Write-Host "現在のディレクトリ: $currentDir" -ForegroundColor Yellow

# バックエンドディレクトリに移動
if (Test-Path "backend") {
    Set-Location "backend"
    Write-Host "✅ バックエンドディレクトリに移動" -ForegroundColor Green
} else {
    Write-Host "❌ バックエンドディレクトリが見つかりません" -ForegroundColor Red
    exit 1
}

# 依存関係をインストール
Write-Host "📦 依存関係をインストール中..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm install が失敗しました" -ForegroundColor Red
    exit 1
}

# TypeScriptをビルド
Write-Host "🔨 TypeScriptをビルド中..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm run build が失敗しました" -ForegroundColor Red
    exit 1
}

# ビルド成果物を確認
if (Test-Path "dist/index.js") {
    Write-Host "✅ ビルド成果物が作成されました" -ForegroundColor Green
} else {
    Write-Host "❌ ビルド成果物が見つかりません" -ForegroundColor Red
    exit 1
}

# ルートディレクトリに戻る
Set-Location ".."

# PM2プロセスを停止（既存のものがあれば）
Write-Host "🛑 既存のPM2プロセスを停止中..." -ForegroundColor Yellow
pm2 stop kintai-backend 2>$null
pm2 delete kintai-backend 2>$null

# PM2でバックエンドを起動
Write-Host "🚀 PM2でバックエンドを起動中..." -ForegroundColor Yellow
pm2 start backend-pm2.config.js

# PM2ステータスを確認
Write-Host "📊 PM2ステータス確認:" -ForegroundColor Yellow
pm2 status

# ログを表示
Write-Host "📝 バックエンドログ:" -ForegroundColor Yellow
pm2 logs kintai-backend --lines 10

Write-Host "✅ バックエンドPM2起動完了！" -ForegroundColor Green
Write-Host "🌐 アクセス: http://localhost:8001" -ForegroundColor Cyan
Write-Host "📊 ステータス確認: pm2 status" -ForegroundColor Cyan
Write-Host "📝 ログ確認: pm2 logs kintai-backend" -ForegroundColor Cyan

