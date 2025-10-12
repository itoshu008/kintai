# 本番環境診断スクリプト
Write-Host "🔍 本番環境診断開始" -ForegroundColor Blue

# 1. 基本接続テスト
Write-Host "`n[1] 基本接続テスト" -ForegroundColor Yellow
$testUrls = @(
    "https://zatint1991.com",
    "https://zatint1991.com/api/admin",
    "https://zatint1991.com/api/admin/health",
    "https://zatint1991.com/api/admin/departments",
    "https://zatint1991.com/m",
    "https://zatint1991.com/master"
)

foreach ($url in $testUrls) {
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 15
        Write-Host "✅ $url - $($response.StatusCode)" -ForegroundColor Green
        
        # レスポンス内容をチェック
        if ($response.Content -like "*<!doctype html>*") {
            Write-Host "  ⚠️ HTMLレスポンス (JSON期待)" -ForegroundColor Yellow
        } elseif ($response.Content -like "*{*") {
            Write-Host "  ✅ JSONレスポンス" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ $url - エラー: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 2. 詳細なエラー分析
Write-Host "`n[2] 詳細エラー分析" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://zatint1991.com/api/admin" -UseBasicParsing -TimeoutSec 15
    Write-Host "ステータス: $($response.StatusCode)" -ForegroundColor Cyan
    Write-Host "Content-Type: $($response.Headers['Content-Type'])" -ForegroundColor Cyan
    Write-Host "レスポンス長: $($response.Content.Length) 文字" -ForegroundColor Cyan
    
    if ($response.Content.Length -lt 200) {
        Write-Host "レスポンス内容:" -ForegroundColor Cyan
        Write-Host $response.Content -ForegroundColor White
    }
} catch {
    Write-Host "詳細分析エラー: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🔍 診断完了" -ForegroundColor Blue
