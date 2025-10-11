# 本番サーバーのバックエンド状況確認スクリプト
# 使用方法: .\check-prod-backend.ps1

Write-Host "🔍 本番サーバーのバックエンド状況を確認中..." -ForegroundColor Green

# 1. 本番環境のヘルスチェック
Write-Host "`n📡 本番環境ヘルスチェック:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://zatint1991.com/api/admin/health" -UseBasicParsing -TimeoutSec 10
    Write-Host "✅ 本番API正常: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "📄 レスポンス: $($response.Content)" -ForegroundColor White
} catch {
    Write-Host "❌ 本番API異常: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 バックエンドが起動していない可能性があります" -ForegroundColor Yellow
}

# 2. フロントエンドの確認
Write-Host "`n🌐 フロントエンド確認:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://zatint1991.com/admin-dashboard-2024" -UseBasicParsing -TimeoutSec 10
    Write-Host "✅ フロントエンド正常: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ フロントエンド異常: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. 本番サーバーでのPM2状況確認（SSH経由）
Write-Host "`n🔧 本番サーバーでのPM2状況確認:" -ForegroundColor Yellow
Write-Host "以下のコマンドを本番サーバーで実行してください:" -ForegroundColor Cyan
Write-Host "ssh itoshu@zatint1991.com" -ForegroundColor White
Write-Host "cd /home/itoshu/projects/kintai/kintai" -ForegroundColor White
Write-Host "pm2 status" -ForegroundColor White
Write-Host "pm2 logs kintai-api --lines 20" -ForegroundColor White

# 4. バックエンド再起動手順
Write-Host "`n🚀 バックエンド再起動手順:" -ForegroundColor Yellow
Write-Host "本番サーバーで以下のコマンドを実行してください:" -ForegroundColor Cyan
Write-Host "cd /home/itoshu/projects/kintai/kintai" -ForegroundColor White
Write-Host "git pull origin main" -ForegroundColor White
Write-Host "cd backend" -ForegroundColor White
Write-Host "npm install" -ForegroundColor White
Write-Host "npm run build" -ForegroundColor White
Write-Host "pm2 restart kintai-api" -ForegroundColor White
Write-Host "pm2 status" -ForegroundColor White

Write-Host "`n✅ 確認完了！" -ForegroundColor Green
