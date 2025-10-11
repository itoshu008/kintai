# 簡易テストスクリプト
# 使用方法: .\quick-test.ps1

Write-Host "🔍 簡易サーバーテストを開始..." -ForegroundColor Green

# 1. PM2ステータス確認
Write-Host "📊 PM2ステータス:" -ForegroundColor Cyan
pm2 status

# 2. ログ確認
Write-Host "📋 最新のログ (最後の20行):" -ForegroundColor Cyan
pm2 logs kintai-api --lines 20

# 3. ポート確認
Write-Host "🔌 ポート8001の使用状況:" -ForegroundColor Cyan
try {
    $portCheck = netstat -an | Select-String ":8001"
    if ($portCheck) {
        Write-Host "✅ ポート8001でリスニング中" -ForegroundColor Green
        Write-Host $portCheck
    } else {
        Write-Host "❌ ポート8001でリスニングしていません" -ForegroundColor Red
    }
} catch {
    Write-Host "⚠️ ポート確認でエラー: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 4. ヘルスチェックテスト
Write-Host "🏥 ヘルスチェックテスト:" -ForegroundColor Cyan

# ローカルテスト
Write-Host "ローカル (http://localhost:8001/api/admin/health):" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8001/api/admin/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ 成功: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "レスポンス: $($response.Content)" -ForegroundColor White
} catch {
    Write-Host "❌ 失敗: $($_.Exception.Message)" -ForegroundColor Red
}

# 本番テスト
Write-Host "本番 (https://zatint1991.com/api/admin/health):" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://zatint1991.com/api/admin/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ 成功: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "レスポンス: $($response.Content)" -ForegroundColor White
} catch {
    Write-Host "❌ 失敗: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "✅ 簡易テスト完了！" -ForegroundColor Green
