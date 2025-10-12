# 本番環境200番問題緊急修正
Write-Host "🚨 本番環境200番問題緊急修正開始" -ForegroundColor Red

# 1. ローカル環境の確認
Write-Host "`n[1] ローカル環境確認" -ForegroundColor Yellow
try {
    $localResponse = Invoke-WebRequest -Uri "http://localhost:8001/api/admin" -UseBasicParsing
    Write-Host "✅ ローカル環境: $($localResponse.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ ローカル環境エラー: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. 本番環境の現在の状況
Write-Host "`n[2] 本番環境現在状況" -ForegroundColor Yellow
try {
    $prodResponse = Invoke-WebRequest -Uri "https://zatint1991.com/api/admin" -UseBasicParsing -TimeoutSec 10
    Write-Host "本番環境ステータス: $($prodResponse.StatusCode)" -ForegroundColor Cyan
    
    if ($prodResponse.Content -like "*<!doctype html>*") {
        Write-Host "❌ 問題: HTMLレスポンス (JSON期待)" -ForegroundColor Red
        Write-Host "修正が必要: バックエンドが正しく動作していない可能性" -ForegroundColor Red
    } elseif ($prodResponse.StatusCode -eq 200) {
        Write-Host "✅ 本番環境は正常動作中" -ForegroundColor Green
    } else {
        Write-Host "❌ 本番環境エラー: $($prodResponse.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ 本番環境接続失敗: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "修正が必要: サーバーが停止しているか、設定に問題" -ForegroundColor Red
}

# 3. 緊急修正手順の提示
Write-Host "`n[3] 緊急修正手順" -ForegroundColor Yellow
Write-Host "1. 本番サーバーにSSH接続" -ForegroundColor White
Write-Host "2. cd /var/www/kintai" -ForegroundColor White
Write-Host "3. git pull origin main" -ForegroundColor White
Write-Host "4. cd backend && npm run build" -ForegroundColor White
Write-Host "5. pm2 restart kintai-backend" -ForegroundColor White
Write-Host "6. pm2 logs kintai-backend" -ForegroundColor White

Write-Host "`n🚨 緊急修正手順完了" -ForegroundColor Red
