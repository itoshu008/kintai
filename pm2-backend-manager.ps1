# バックエンドPM2管理スクリプト
# PowerShell用

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("start", "stop", "restart", "status", "logs", "delete", "reload")]
    [string]$Action
)

Write-Host "🔧 バックエンドPM2管理スクリプト" -ForegroundColor Green

switch ($Action) {
    "start" {
        Write-Host "🚀 バックエンドを起動中..." -ForegroundColor Yellow
        pm2 start backend-pm2.config.js
        pm2 status
    }
    "stop" {
        Write-Host "🛑 バックエンドを停止中..." -ForegroundColor Yellow
        pm2 stop kintai-backend
        pm2 status
    }
    "restart" {
        Write-Host "🔄 バックエンドを再起動中..." -ForegroundColor Yellow
        pm2 restart kintai-backend
        pm2 status
    }
    "status" {
        Write-Host "📊 PM2ステータス確認:" -ForegroundColor Yellow
        pm2 status
    }
    "logs" {
        Write-Host "📝 バックエンドログ表示:" -ForegroundColor Yellow
        pm2 logs kintai-backend --lines 50
    }
    "delete" {
        Write-Host "🗑️ バックエンドプロセスを削除中..." -ForegroundColor Yellow
        pm2 delete kintai-backend
        pm2 status
    }
    "reload" {
        Write-Host "🔄 バックエンドをリロード中..." -ForegroundColor Yellow
        pm2 reload kintai-backend
        pm2 status
    }
}

Write-Host "✅ 操作完了！" -ForegroundColor Green

