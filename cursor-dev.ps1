# Cursor開発環境スクリプト
# PowerShell用 - TypeScriptビルドとバックエンド管理

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("build", "start", "restart", "stop", "logs", "status", "health", "dev", "clean")]
    [string]$Action = "dev"
)

Write-Host "🚀 Cursor開発環境スクリプト" -ForegroundColor Green
Write-Host "アクション: $Action" -ForegroundColor Yellow

switch ($Action) {
    "build" {
        Write-Host "🔨 プロジェクト全体をビルド中..." -ForegroundColor Yellow
        
        # フロントエンドビルド
        Write-Host "📱 フロントエンドビルド..." -ForegroundColor Cyan
        Set-Location "frontend"
        npm install
        npm run build
        Set-Location ".."
        
        # バックエンドビルド
        Write-Host "⚙️ バックエンドビルド..." -ForegroundColor Cyan
        Set-Location "backend"
        npm install
        npm run build
        Set-Location ".."
        
        Write-Host "✅ ビルド完了！" -ForegroundColor Green
    }
    
    "start" {
        Write-Host "🚀 バックエンドを起動中..." -ForegroundColor Yellow
        
        # 既存プロセスを停止
        pm2 delete kintai-backend 2>$null
        
        # バックエンドを起動
        pm2 start backend-pm2.config.js
        
        # ステータス確認
        pm2 status
        
        Write-Host "✅ バックエンド起動完了！" -ForegroundColor Green
        Write-Host "🌐 アクセス: http://localhost:8001" -ForegroundColor Cyan
    }
    
    "restart" {
        Write-Host "🔄 バックエンドを再起動中..." -ForegroundColor Yellow
        pm2 restart kintai-backend
        pm2 status
        Write-Host "✅ 再起動完了！" -ForegroundColor Green
    }
    
    "stop" {
        Write-Host "🛑 バックエンドを停止中..." -ForegroundColor Yellow
        pm2 stop kintai-backend
        pm2 status
        Write-Host "✅ 停止完了！" -ForegroundColor Green
    }
    
    "logs" {
        Write-Host "📝 バックエンドログ表示:" -ForegroundColor Yellow
        pm2 logs kintai-backend --lines 50
    }
    
    "status" {
        Write-Host "📊 PM2ステータス:" -ForegroundColor Yellow
        pm2 status
    }
    
    "health" {
        Write-Host "🏥 ヘルスチェック実行中..." -ForegroundColor Yellow
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8001/api/admin/health" -UseBasicParsing
            Write-Host "✅ ヘルスチェック成功: $($response.StatusCode)" -ForegroundColor Green
            Write-Host "📄 レスポンス: $($response.Content)" -ForegroundColor Cyan
        } catch {
            Write-Host "❌ ヘルスチェック失敗: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    "dev" {
        Write-Host "🛠️ 開発環境セットアップ中..." -ForegroundColor Yellow
        
        # 1. ビルド
        & $PSCommandPath -Action build
        
        # 2. 起動
        & $PSCommandPath -Action start
        
        # 3. ヘルスチェック
        Start-Sleep -Seconds 3
        & $PSCommandPath -Action health
        
        Write-Host "🎉 開発環境セットアップ完了！" -ForegroundColor Green
    }
    
    "clean" {
        Write-Host "🧹 クリーンアップ実行中..." -ForegroundColor Yellow
        
        # PM2プロセス停止
        pm2 delete kintai-backend 2>$null
        
        # ビルド成果物削除
        if (Test-Path "frontend/dist") {
            Remove-Item -Recurse -Force "frontend/dist"
            Write-Host "🗑️ フロントエンドdist削除" -ForegroundColor Yellow
        }
        
        if (Test-Path "backend/dist") {
            Remove-Item -Recurse -Force "backend/dist"
            Write-Host "🗑️ バックエンドdist削除" -ForegroundColor Yellow
        }
        
        Write-Host "✅ クリーンアップ完了！" -ForegroundColor Green
    }
}

Write-Host "🎯 利用可能なコマンド:" -ForegroundColor Cyan
Write-Host "  .\cursor-dev.ps1 build    # ビルド" -ForegroundColor White
Write-Host "  .\cursor-dev.ps1 start    # 起動" -ForegroundColor White
Write-Host "  .\cursor-dev.ps1 restart  # 再起動" -ForegroundColor White
Write-Host "  .\cursor-dev.ps1 stop     # 停止" -ForegroundColor White
Write-Host "  .\cursor-dev.ps1 logs     # ログ" -ForegroundColor White
Write-Host "  .\cursor-dev.ps1 status   # ステータス" -ForegroundColor White
Write-Host "  .\cursor-dev.ps1 health   # ヘルスチェック" -ForegroundColor White
Write-Host "  .\cursor-dev.ps1 dev      # 開発環境セットアップ" -ForegroundColor White
Write-Host "  .\cursor-dev.ps1 clean    # クリーンアップ" -ForegroundColor White

