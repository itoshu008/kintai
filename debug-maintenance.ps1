# メンテナンス画面デバッグスクリプト
# 使用方法: .\debug-maintenance.ps1

Write-Host "🔍 メンテナンス画面の原因を調査中..." -ForegroundColor Green

try {
    # 1. PM2ステータス確認
    Write-Host "📊 PM2ステータス:" -ForegroundColor Cyan
    pm2 status

    # 2. PM2ログ確認
    Write-Host "📋 PM2ログ (最後の30行):" -ForegroundColor Cyan
    pm2 logs kintai-api --lines 30

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

    # 4. ヘルスチェックエンドポイントテスト
    Write-Host "🏥 ヘルスチェックエンドポイントテスト:" -ForegroundColor Cyan

    # ローカルテスト
    Write-Host "ローカル (http://localhost:8001/api/admin/health):" -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8001/api/admin/health" -UseBasicParsing -TimeoutSec 5
        Write-Host "✅ 成功: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "レスポンス: $($response.Content)" -ForegroundColor White
    } catch {
        Write-Host "❌ 失敗: $($_.Exception.Message)" -ForegroundColor Red
    }

    # 部署APIテスト
    Write-Host "部署API (http://localhost:3000/api/admin/departments):" -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/admin/departments" -UseBasicParsing -TimeoutSec 5
        Write-Host "✅ 成功: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "レスポンス: $($response.Content)" -ForegroundColor White
    } catch {
        Write-Host "❌ 失敗: $($_.Exception.Message)" -ForegroundColor Red
    }

    # 本番テスト
    Write-Host "本番 (https://zatint1991.com/api/admin/departments):" -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "https://zatint1991.com/api/admin/departments" -UseBasicParsing -TimeoutSec 10
        Write-Host "✅ 成功: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "レスポンス: $($response.Content)" -ForegroundColor White
    } catch {
        Write-Host "❌ 失敗: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "これがメンテナンス画面の原因です！" -ForegroundColor Red
    }

    # 5. 解決策の提案
    Write-Host "🛠️ 解決策:" -ForegroundColor Cyan
    Write-Host "1. PM2でサーバーを再起動: pm2 restart kintai-api" -ForegroundColor White
    Write-Host "2. 完全な再起動: pm2 delete kintai-api && pm2 start backend/dist/index.js --name kintai-api --env production" -ForegroundColor White
    Write-Host "3. ログを詳しく確認: pm2 logs kintai-api --lines 50" -ForegroundColor White

} catch {
    Write-Host "❌ デバッグ中にエラーが発生しました: $($_.Exception.Message)" -ForegroundColor Red
}
