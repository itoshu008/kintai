# 強力なAPIステータスチェックスクリプト (PowerShell版)
# 詳細な診断とレポート機能付き

# 色付き出力の設定
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"
$Cyan = "Cyan"

# ログファイルの設定
$LogFile = "api-check-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
$ReportFile = "api-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"

Write-Host "🔍 強力なAPIステータスチェック開始" -ForegroundColor $Cyan
Write-Host "=================================" -ForegroundColor $Cyan
Write-Host "ログファイル: $LogFile" -ForegroundColor $Blue
Write-Host "レポートファイル: $ReportFile" -ForegroundColor $Blue
Write-Host ""

# チェックするエンドポイント一覧（詳細情報付き）
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

# POSTリクエスト用のエンドポイント
$postEndpoints = @{
    "部署作成" = "http://localhost:8001/api/admin/departments"
}

# 統計変数
$successCount = 0
$errorCount = 0
$totalCount = 0
$responseTimes = @()

# JSONレポート用の配列
$jsonResults = @()

# エンドポイントチェック関数
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [string]$Body = $null
    )
    
    Write-Host "チェック中: $Name - $Url" -ForegroundColor $Yellow | Tee-Object -FilePath $LogFile -Append
    
    # レスポンス時間の測定開始
    $startTime = Get-Date
    
    try {
        # HTTPリクエストの実行
        if ($Method -eq "POST" -and $Body) {
            $response = Invoke-WebRequest -Uri $Url -Method POST -Body $Body -ContentType "application/json" -UseBasicParsing
        } else {
            $response = Invoke-WebRequest -Uri $Url -Method GET -UseBasicParsing
        }
        
        # レスポンス時間の計算
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalSeconds
        
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $Name`: $Url - OK ($($response.StatusCode)) - $([math]::Round($responseTime, 3))s" -ForegroundColor $Green | Tee-Object -FilePath $LogFile -Append
            $script:successCount++
            $script:responseTimes += $responseTime
        } else {
            Write-Host "❌ $Name`: $Url - エラー ($($response.StatusCode)) - $([math]::Round($responseTime, 3))s" -ForegroundColor $Red | Tee-Object -FilePath $LogFile -Append
            $script:errorCount++
        }
        
        # Content-Typeの確認
        $contentType = $response.Headers["Content-Type"]
        if ($contentType -like "*application/json*") {
            Write-Host "  Content-Type: $contentType" -ForegroundColor $Blue | Tee-Object -FilePath $LogFile -Append
        } elseif ($contentType -like "*text/html*") {
            Write-Host "  Content-Type: $contentType (HTMLレスポンス)" -ForegroundColor $Yellow | Tee-Object -FilePath $LogFile -Append
        } else {
            Write-Host "  Content-Type: $contentType" -ForegroundColor $Yellow | Tee-Object -FilePath $LogFile -Append
        }
        
        # レスポンスサイズの確認
        $responseSize = $response.Content.Length
        Write-Host "  レスポンスサイズ: $responseSize bytes" -ForegroundColor $Blue | Tee-Object -FilePath $LogFile -Append
        
        # JSONレポート用のデータ追加
        $jsonResults += @{
            name = $Name
            url = $Url
            method = $Method
            status_code = $response.StatusCode
            response_time = [math]::Round($responseTime, 3)
            content_type = $contentType
            response_size = $responseSize
            success = ($response.StatusCode -eq 200)
        }
        
    } catch {
        Write-Host "❌ $Name`: $Url - 接続エラー: $($_.Exception.Message)" -ForegroundColor $Red | Tee-Object -FilePath $LogFile -Append
        $script:errorCount++
        
        # JSONレポート用のデータ追加
        $jsonResults += @{
            name = $Name
            url = $Url
            method = $Method
            status_code = 0
            response_time = 0
            content_type = "error"
            response_size = 0
            success = $false
            error = $_.Exception.Message
        }
    }
    
    $script:totalCount++
    Write-Host "" | Tee-Object -FilePath $LogFile -Append
}

# メイン処理
Write-Host "📊 GETリクエストのチェック" -ForegroundColor $Blue
Write-Host "================================" -ForegroundColor $Blue | Tee-Object -FilePath $LogFile -Append

foreach ($name in $endpoints.Keys) {
    Test-Endpoint -Name $name -Url $endpoints[$name] -Method "GET"
}

Write-Host "📊 POSTリクエストのチェック" -ForegroundColor $Blue
Write-Host "================================" -ForegroundColor $Blue | Tee-Object -FilePath $LogFile -Append

foreach ($name in $postEndpoints.Keys) {
    $testBody = '{"name":"テスト部署"}'
    Test-Endpoint -Name $name -Url $postEndpoints[$name] -Method "POST" -Body $testBody
}

# 統計の計算
$successRate = if ($totalCount -gt 0) { [math]::Round(($successCount * 100) / $totalCount, 2) } else { 0 }
$avgResponseTime = if ($responseTimes.Count -gt 0) { [math]::Round(($responseTimes | Measure-Object -Average).Average, 3) } else { 0 }

# 結果サマリー
Write-Host "📊 チェック結果サマリー" -ForegroundColor $Cyan
Write-Host "=======================" -ForegroundColor $Cyan
Write-Host "✅ 成功: $successCount" -ForegroundColor $Green
Write-Host "❌ エラー: $errorCount" -ForegroundColor $Red
Write-Host "📈 成功率: ${successRate}%" -ForegroundColor $Blue
Write-Host "⏱️  平均レスポンス時間: ${avgResponseTime}s" -ForegroundColor $Yellow

# エラー詳細
if ($errorCount -gt 0) {
    Write-Host "❌ エラー詳細" -ForegroundColor $Red
    Write-Host "=============" -ForegroundColor $Red
    Get-Content $LogFile | Where-Object { $_ -like "*❌*" } | ForEach-Object { Write-Host $_ -ForegroundColor $Red }
}

# 推奨アクション
Write-Host "🎯 推奨アクション" -ForegroundColor $Cyan
if ($errorCount -eq 0) {
    Write-Host "• 全てのエンドポイントが正常に動作しています！" -ForegroundColor $Green
} else {
    Write-Host "• エラーが発生したエンドポイントを確認してください" -ForegroundColor $Yellow
    Write-Host "• PM2ログを確認: pm2 logs kintai-backend" -ForegroundColor $Yellow
    Write-Host "• バックエンドを再起動: pm2 restart kintai-backend" -ForegroundColor $Yellow
}

# JSONレポートの保存
$jsonResults | ConvertTo-Json -Depth 3 | Out-File -FilePath $ReportFile -Encoding UTF8

# ファイル保存完了の通知
Write-Host "📁 ファイル保存完了" -ForegroundColor $Blue
Write-Host "• ログファイル: $LogFile" -ForegroundColor $Blue
Write-Host "• レポートファイル: $ReportFile" -ForegroundColor $Blue

Write-Host "🔍 強力なAPIステータスチェック完了" -ForegroundColor $Cyan
