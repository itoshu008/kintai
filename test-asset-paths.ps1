# アセットパスの動作確認スクリプト (PowerShell版)

Write-Host "🔍 アセットパスの動作確認を開始します..." -ForegroundColor Blue

$PUB = "/home/zatint1991-hvt55/zatint1991.com/public/admin-dashboard-2024"

Write-Host "📁 ディレクトリ確認: $PUB" -ForegroundColor Yellow

# index.htmlの内容を確認
$indexPath = "$PUB/index.html"
if (Test-Path $indexPath) {
    Write-Host "✅ index.html が見つかりました" -ForegroundColor Green
} else {
    Write-Host "❌ index.html が見つかりません" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔍 index.html 内のJSパスを抽出中..." -ForegroundColor Blue

# JSパスを抽出
$content = Get-Content $indexPath -Raw
$jsMatch = [regex]::Match($content, 'src="([^"]*assets/[^"]*\.js)"')
if ($jsMatch.Success) {
    $REL = $jsMatch.Groups[1].Value
    Write-Host "📄 抽出されたJSパス: $REL" -ForegroundColor Yellow
} else {
    Write-Host "❌ メインJSが見つかりません" -ForegroundColor Red
    exit 1
}

# 相対パスの場合は /kintai/ を前置
if ($REL.StartsWith("/kintai/")) {
    $ASSET = $REL
} elseif ($REL.StartsWith("assets/")) {
    $ASSET = "/kintai/$REL"
} elseif ($REL.Contains("/assets/")) {
    $ASSET = "/$REL"
} else {
    $ASSET = "/kintai/$REL"
}

Write-Host "🎯 最終アセットパス: $ASSET" -ForegroundColor Cyan

Write-Host ""
Write-Host "🌐 アセットのHTTPステータス確認中..." -ForegroundColor Blue

try {
    $response = Invoke-WebRequest -Uri "https://zatint1991.com$ASSET" -UseBasicParsing -TimeoutSec 10
    $status = $response.StatusCode
    Write-Host "HTTPステータス: $status" -ForegroundColor Yellow
    
    if ($status -eq 200) {
        Write-Host "✅ アセットパスは正常に動作しています！" -ForegroundColor Green
        Write-Host "🎉 白ページ問題は解決されるはずです" -ForegroundColor Green
    } else {
        Write-Host "❌ アセットパスに問題があります" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ アセットパスに問題があります: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "🔍 詳細確認:" -ForegroundColor Yellow
    try {
        Invoke-WebRequest -Uri "https://zatint1991.com$ASSET" -Method Head -UseBasicParsing
    } catch {
        Write-Host "詳細エラー: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📋 確認用コマンド:" -ForegroundColor Cyan
Write-Host "curl -s https://zatint1991.com/kintai/ | sed -n '1,60p'" -ForegroundColor White
Write-Host "nginx -T | grep -A 5 -B 5 kintai" -ForegroundColor White
