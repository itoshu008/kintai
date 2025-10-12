# 緊急本番デプロイスクリプト
Write-Host "🚨 緊急本番デプロイ開始" -ForegroundColor Red

# 1. 現在の変更をコミット
Write-Host "`n[1] 変更をコミット中..." -ForegroundColor Yellow
git add .
git commit -m "緊急修正: 重複エンドポイント削除、200番問題解決"

# 2. GitHubにプッシュ
Write-Host "`n[2] GitHubにプッシュ中..." -ForegroundColor Yellow
git push origin main

# 3. 本番環境への接続テスト
Write-Host "`n[3] 本番環境接続テスト..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://zatint1991.com" -UseBasicParsing -TimeoutSec 10
    Write-Host "✅ 本番環境接続成功: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ 本番環境接続失敗: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. APIエンドポイントテスト
Write-Host "`n[4] APIエンドポイントテスト..." -ForegroundColor Yellow
$endpoints = @(
    "https://zatint1991.com/api/admin",
    "https://zatint1991.com/api/admin/health",
    "https://zatint1991.com/api/admin/departments"
)

foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri $endpoint -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $endpoint - $($response.StatusCode)" -ForegroundColor Green
        } else {
            Write-Host "❌ $endpoint - $($response.StatusCode)" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ $endpoint - エラー: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n🚨 緊急デプロイ完了" -ForegroundColor Red
