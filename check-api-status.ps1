# API ステータスチェックスクリプト
# 200になっていないエンドポイントを判別

Write-Host "API ステータスチェック開始" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# チェックするエンドポイント一覧
$endpoints = @(
    @{ Name = "メイン"; Url = "http://localhost:8001"; Method = "GET" },
    @{ Name = "API基本"; Url = "http://localhost:8001/api/admin"; Method = "GET" },
    @{ Name = "ヘルスチェック"; Url = "http://localhost:8001/api/admin/health"; Method = "GET" },
    @{ Name = "部署一覧"; Url = "http://localhost:8001/api/admin/departments"; Method = "GET" },
    @{ Name = "社員一覧"; Url = "http://localhost:8001/api/admin/employees"; Method = "GET" },
    @{ Name = "マスターデータ"; Url = "http://localhost:8001/api/admin/master"; Method = "GET" },
    @{ Name = "マスターページ(/m)"; Url = "http://localhost:8001/m"; Method = "GET" },
    @{ Name = "マスターページ(/master)"; Url = "http://localhost:8001/master"; Method = "GET" },
    @{ Name = "旧マスターページ"; Url = "http://localhost:8001/admin-dashboard-2024"; Method = "GET" },
    @{ Name = "パーソナルページ(/p)"; Url = "http://localhost:8001/p"; Method = "GET" },
    @{ Name = "パーソナルページ(/personal)"; Url = "http://localhost:8001/personal"; Method = "GET" }
)

$results = @()
$errorCount = 0
$successCount = 0

# GETリクエストのチェック
foreach ($endpoint in $endpoints) {
    try {
        Write-Host "チェック中: $($endpoint.Name) - $($endpoint.Url)" -ForegroundColor Yellow
        
        $response = Invoke-WebRequest -Uri $endpoint.Url -Method $endpoint.Method -UseBasicParsing -TimeoutSec 10
        
        if ($response.StatusCode -eq 200) {
            Write-Host "SUCCESS $($endpoint.Name): $($response.StatusCode) OK" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "ERROR $($endpoint.Name): $($response.StatusCode) ERROR" -ForegroundColor Red
            $errorCount++
        }
        
        $results += @{
            Name = $endpoint.Name
            Url = $endpoint.Url
            StatusCode = $response.StatusCode
            Success = ($response.StatusCode -eq 200)
            ContentType = $response.Headers.'Content-Type'
        }
    }
    catch {
        Write-Host "ERROR $($endpoint.Name): 接続エラー - $($_.Exception.Message)" -ForegroundColor Red
        $errorCount++
        
        $results += @{
            Name = $endpoint.Name
            Url = $endpoint.Url
            StatusCode = "ERROR"
            Success = $false
            ContentType = "N/A"
            Error = $_.Exception.Message
        }
    }
}

Write-Host ""
Write-Host "チェック結果サマリー" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan
Write-Host "成功: $successCount" -ForegroundColor Green
Write-Host "エラー: $errorCount" -ForegroundColor Red

Write-Host ""
Write-Host "エラー詳細" -ForegroundColor Red
Write-Host "=============" -ForegroundColor Red

$errorResults = $results | Where-Object { -not $_.Success }
foreach ($error in $errorResults) {
    Write-Host "• $($error.Name): $($error.StatusCode)" -ForegroundColor Red
    if ($error.Error) {
        Write-Host "  エラー: $($error.Error)" -ForegroundColor DarkRed
    }
    Write-Host "  URL: $($error.Url)" -ForegroundColor DarkRed
    Write-Host ""
}

Write-Host "成功詳細" -ForegroundColor Green
Write-Host "=============" -ForegroundColor Green

$successResults = $results | Where-Object { $_.Success }
foreach ($success in $successResults) {
    Write-Host "• $($success.Name): $($success.StatusCode) - $($success.ContentType)" -ForegroundColor Green
}

Write-Host ""
Write-Host "API ステータスチェック完了" -ForegroundColor Green