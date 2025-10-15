# 新マスターページの白ページ問題修正スクリプト

Write-Host "🚀 新マスターページの白ページ問題を修正します..." -ForegroundColor Blue

Write-Host ""
Write-Host "1️⃣ nginx設定ファイルを更新中..." -ForegroundColor Yellow
Write-Host "nginx設定を /etc/nginx/sites-enabled/zatint1991.com にコピーしてください" -ForegroundColor White
Write-Host "コピー先: /etc/nginx/sites-enabled/zatint1991.com" -ForegroundColor White

Write-Host ""
Write-Host "2️⃣ nginx設定のテストとリロード..." -ForegroundColor Yellow
Write-Host "以下のコマンドをVPSで実行してください:" -ForegroundColor White
Write-Host "sudo nginx -t && sudo systemctl reload nginx" -ForegroundColor Cyan

Write-Host ""
Write-Host "3️⃣ フロントエンドの再ビルド..." -ForegroundColor Yellow
Write-Host "以下のコマンドをVPSで実行してください:" -ForegroundColor White
Write-Host "cd /home/zatint1991-hvt55/zatint1991.com/frontend" -ForegroundColor Cyan
Write-Host "npm ci --no-audit --no-fund || npm install --no-audit --no-fund" -ForegroundColor Cyan
Write-Host "npm run build" -ForegroundColor Cyan

Write-Host ""
Write-Host "4️⃣ ビルド結果の配置..." -ForegroundColor Yellow
Write-Host "以下のコマンドをVPSで実行してください:" -ForegroundColor White
Write-Host "sudo mkdir -p /home/zatint1991-hvt55/zatint1991.com/public/admin-dashboard-2024" -ForegroundColor Cyan
Write-Host "rsync -az --delete /home/zatint1991-hvt55/zatint1991.com/frontend/dist/ /home/zatint1991-hvt55/zatint1991.com/public/admin-dashboard-2024/" -ForegroundColor Cyan
Write-Host "sudo chown -R itoshu:itoshu /home/zatint1991-hvt55/zatint1991.com/public/admin-dashboard-2024" -ForegroundColor Cyan

Write-Host ""
Write-Host "5️⃣ 動作確認..." -ForegroundColor Yellow
Write-Host "以下のURLにアクセスして確認してください:" -ForegroundColor White
Write-Host "https://zatint1991.com/kintai/" -ForegroundColor Green
Write-Host "https://zatint1991.com/kintai/personal" -ForegroundColor Green

Write-Host ""
Write-Host "🔍 トラブルシューティング用コマンド:" -ForegroundColor Cyan
Write-Host "curl -s https://zatint1991.com/kintai/ | Select-String 'assets' | Select-Object -First 5" -ForegroundColor White
Write-Host "curl -I https://zatint1991.com/kintai/assets/index-[hash].js" -ForegroundColor White

Write-Host ""
Write-Host "✅ 修正手順が完了しました！" -ForegroundColor Green
