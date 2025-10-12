# シンプルなサーバー診断スクリプト
Write-Host "🔍 サーバー診断スクリプト" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# 1. PM2ステータス
Write-Host "`n📊 PM2ステータス" -ForegroundColor Blue
pm2 list

# 2. ポート8001の使用状況
Write-Host "`n🔌 ポート8001の使用状況" -ForegroundColor Blue
$portInfo = netstat -ano | findstr :8001
if ($portInfo) {
    Write-Host $portInfo -ForegroundColor Yellow
} else {
    Write-Host "ポート8001は使用されていません" -ForegroundColor Red
}

# 3. エンドポイントテスト
Write-Host "`n🧪 エンドポイントテスト" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue

$endpoints = @(
    @{Name="メインページ"; Path="/"},
    @{Name="API基本"; Path="/api/admin"},
    @{Name="ヘルスチェック"; Path="/api/admin/health"},
    @{Name="部署一覧"; Path="/api/admin/departments"},
    @{Name="社員一覧"; Path="/api/admin/employees"},
    @{Name="マスターデータ"; Path="/api/admin/master"},
    @{Name="マスターページ(/m)"; Path="/m"},
    @{Name="マスターページ(/master)"; Path="/master"},
    @{Name="旧マスターページ"; Path="/admin-dashboard-2024"},
    @{Name="パーソナルページ(/p)"; Path="/p"},
    @{Name="パーソナルページ(/personal)"; Path="/personal"}
)

$successCount = 0
$errorCount = 0

foreach ($endpoint in $endpoints) {
    $url = "http://localhost:8001$($endpoint.Path)"
    
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $($endpoint.Name): $($endpoint.Path) - OK" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "❌ $($endpoint.Name): $($endpoint.Path) - エラー ($($response.StatusCode))" -ForegroundColor Red
            $errorCount++
        }
    } catch {
        Write-Host "❌ $($endpoint.Name): $($endpoint.Path) - 接続エラー" -ForegroundColor Red
        $errorCount++
    }
}

# 4. サマリー
Write-Host "`n📊 結果サマリー" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "✅ 成功: $successCount" -ForegroundColor Green
Write-Host "❌ エラー: $errorCount" -ForegroundColor Red

$total = $successCount + $errorCount
$successRate = if ($total -gt 0) { [math]::Round(($successCount * 100) / $total, 2) } else { 0 }
Write-Host "📈 成功率: ${successRate}%" -ForegroundColor Blue

# 5. 推奨アクション
Write-Host "`n🎯 推奨アクション" -ForegroundColor Cyan
if ($errorCount -eq 0) {
    Write-Host "• 全てのエンドポイントが正常に動作しています！" -ForegroundColor Green
} else {
    Write-Host "• エラーが発生したエンドポイントを確認してください" -ForegroundColor Yellow
    Write-Host "• PM2ログを確認: pm2 logs kintai-backend" -ForegroundColor Yellow
    Write-Host "• バックエンドを再起動: pm2 restart kintai-backend" -ForegroundColor Yellow
}

Write-Host "`n🔍 診断完了" -ForegroundColor Cyan
