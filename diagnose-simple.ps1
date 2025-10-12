# 簡易システム診断スクリプト
Write-Host "======================================" -ForegroundColor Cyan
Write-Host " 簡易システム診断スクリプト" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# 1. PM2の状態
Write-Host "`n[1] PM2プロセスの状態" -ForegroundColor Blue
pm2 list

# 2. フロントエンドビルドの確認
Write-Host "`n[2] フロントエンドビルドの確認" -ForegroundColor Blue
if (Test-Path "frontend\dist\index.html") {
    Write-Host "✅ フロントエンドがビルドされています" -ForegroundColor Green
    Get-ChildItem "frontend\dist" | Select-Object Name,Length | Format-Table
} else {
    Write-Host "❌ フロントエンドがビルドされていません" -ForegroundColor Red
}

# 3. ポート8001の使用状況
Write-Host "`n[3] ポート8001の使用状況" -ForegroundColor Blue
netstat -ano | findstr :8001

# 4. エンドポイントテスト
Write-Host "`n[4] エンドポイントテスト" -ForegroundColor Blue

$endpoints = @(
    "http://localhost:8001",
    "http://localhost:8001/api/admin",
    "http://localhost:8001/api/admin/health",
    "http://localhost:8001/api/admin/departments",
    "http://localhost:8001/m",
    "http://localhost:8001/master",
    "http://localhost:8001/admin-dashboard-2024",
    "http://localhost:8001/p",
    "http://localhost:8001/personal"
)

$success = 0
$error = 0

foreach ($url in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $url" -ForegroundColor Green
            $success++
        } else {
            Write-Host "❌ $url - $($response.StatusCode)" -ForegroundColor Red
            $error++
        }
    } catch {
        Write-Host "❌ $url - 接続エラー" -ForegroundColor Red
        $error++
    }
}

# 5. サマリー
Write-Host "`n[5] サマリー" -ForegroundColor Blue
Write-Host "✅ 成功: $success" -ForegroundColor Green
Write-Host "❌ エラー: $error" -ForegroundColor Red

$total = $success + $error
$rate = if ($total -gt 0) { [math]::Round(($success * 100) / $total, 2) } else { 0 }
Write-Host "📈 成功率: ${rate}%" -ForegroundColor Blue

# 6. PM2ログ
Write-Host "`n[6] PM2ログ（最新10行）" -ForegroundColor Blue
pm2 logs kintai-backend --lines 10 --nostream

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host " 診断完了" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
