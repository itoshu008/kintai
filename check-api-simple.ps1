# 簡易版強力なAPIステータスチェックスクリプト (PowerShell版)

Write-Host "🔍 強力なAPIステータスチェック開始" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# チェックするエンドポイント一覧
$endpoints = @{
    "メイン" = "http://localhost:8001"
    "API基本" = "http://localhost:8001/api/admin"
    "ヘルスチェック" = "http://localhost:8001/api/admin/health"
    "部署一覧" = "http://localhost:8001/api/admin/departments"
    "社員一覧" = "http://localhost:8001/api/admin/employees"
    "マスターデータ" = "http://localhost:8001/api/admin/master"
    "マスターページ(/m)" = "http://localhost:8001/m"
    "マスターページ(/master)" = "http://localhost:8001/master"
    "旧マスターページ" = "http://localhost:8001/admin-dashboard-2024"
    "パーソナルページ(/p)" = "http://localhost:8001/p"
    "パーソナルページ(/personal)" = "http://localhost:8001/personal"
}

# 統計変数
$successCount = 0
$errorCount = 0
$totalCount = 0
$responseTimes = @()

Write-Host "`n📊 エンドポイントチェック開始" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue

foreach ($name in $endpoints.Keys) {
    $url = $endpoints[$name]
    Write-Host "`nチェック中: $name - $url" -ForegroundColor Yellow
    
    try {
        $startTime = Get-Date
        $response = Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing -TimeoutSec 10
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalSeconds
        
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $name`: $url - OK ($($response.StatusCode)) - $([math]::Round($responseTime, 3))s" -ForegroundColor Green
            $successCount++
            $responseTimes += $responseTime
            
            # Content-Typeの確認
            $contentType = $response.Headers["Content-Type"]
            if ($contentType -like "*application/json*") {
                Write-Host "  Content-Type: $contentType" -ForegroundColor Blue
            } elseif ($contentType -like "*text/html*") {
                Write-Host "  Content-Type: $contentType (HTMLレスポンス)" -ForegroundColor Yellow
            } else {
                Write-Host "  Content-Type: $contentType" -ForegroundColor Yellow
            }
            
            # レスポンスサイズの確認
            $responseSize = $response.Content.Length
            Write-Host "  レスポンスサイズ: $responseSize bytes" -ForegroundColor Blue
        } else {
            Write-Host "❌ $name`: $url - エラー ($($response.StatusCode)) - $([math]::Round($responseTime, 3))s" -ForegroundColor Red
            $errorCount++
        }
        
    } catch {
        Write-Host "❌ $name`: $url - 接続エラー: $($_.Exception.Message)" -ForegroundColor Red
        $errorCount++
    }
    
    $totalCount++
}

# 統計の計算
$successRate = if ($totalCount -gt 0) { [math]::Round(($successCount * 100) / $totalCount, 2) } else { 0 }
$avgResponseTime = if ($responseTimes.Count -gt 0) { [math]::Round(($responseTimes | Measure-Object -Average).Average, 3) } else { 0 }

# 結果サマリー
Write-Host "`n📊 チェック結果サマリー" -ForegroundColor Cyan
Write-Host "=======================" -ForegroundColor Cyan
Write-Host "✅ 成功: $successCount" -ForegroundColor Green
Write-Host "❌ エラー: $errorCount" -ForegroundColor Red
Write-Host "📈 成功率: ${successRate}%" -ForegroundColor Blue
Write-Host "⏱️  平均レスポンス時間: ${avgResponseTime}s" -ForegroundColor Yellow

# 推奨アクション
Write-Host "`n🎯 推奨アクション" -ForegroundColor Cyan
if ($errorCount -eq 0) {
    Write-Host "• 全てのエンドポイントが正常に動作しています！" -ForegroundColor Green
} else {
    Write-Host "• エラーが発生したエンドポイントを確認してください" -ForegroundColor Yellow
    Write-Host "• PM2ログを確認: pm2 logs kintai-backend" -ForegroundColor Yellow
    Write-Host "• バックエンドを再起動: pm2 restart kintai-backend" -ForegroundColor Yellow
}

Write-Host "`n🔍 強力なAPIステータスチェック完了" -ForegroundColor Cyan
