#!/bin/bash

# 強力なAPIステータスチェックスクリプト
# 詳細な診断とレポート機能付き

# 色付き出力の設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ログファイルの設定
LOG_FILE="api-check-$(date +%Y%m%d-%H%M%S).log"
REPORT_FILE="api-report-$(date +%Y%m%d-%H%M%S).json"

echo -e "${CYAN}🔍 強力なAPIステータスチェック開始${NC}"
echo -e "${CYAN}=================================${NC}"
echo "ログファイル: $LOG_FILE"
echo "レポートファイル: $REPORT_FILE"
echo ""

# チェックするエンドポイント一覧（詳細情報付き）
declare -A endpoints=(
    ["メイン"]="http://localhost:8001"
    ["API基本"]="http://localhost:8001/api/admin"
    ["ヘルスチェック"]="http://localhost:8001/api/admin/health"
    ["部署一覧"]="http://localhost:8001/api/admin/departments"
    ["社員一覧"]="http://localhost:8001/api/admin/employees"
    ["マスターデータ"]="http://localhost:8001/api/admin/master"
    ["マスターページ(/m)"]="http://localhost:8001/m"
    ["マスターページ(/master)"]="http://localhost:8001/master"
    ["旧マスターページ"]="http://localhost:8001/admin-dashboard-2024"
    ["パーソナルページ(/p)"]="http://localhost:8001/p"
    ["パーソナルページ(/personal)"]="http://localhost:8001/personal"
)

# POSTリクエスト用のエンドポイント
declare -A post_endpoints=(
    ["部署作成"]="http://localhost:8001/api/admin/departments"
)

# 統計変数
success_count=0
error_count=0
total_count=0
response_times=()

# JSONレポート用の配列
json_results="["

# エンドポイントチェック関数
check_endpoint() {
    local name="$1"
    local url="$2"
    local method="${3:-GET}"
    local body="${4:-}"
    
    echo -e "${YELLOW}チェック中: $name - $url${NC}" | tee -a "$LOG_FILE"
    
    # レスポンス時間の測定開始
    start_time=$(date +%s.%N)
    
    # HTTPリクエストの実行
    if [ "$method" = "POST" ] && [ -n "$body" ]; then
        response=$(curl -s -w "\n%{http_code}\n%{time_total}\n%{content_type}" \
            -X POST \
            -H "Content-Type: application/json" \
            -d "$body" \
            "$url" 2>&1)
    else
        response=$(curl -s -w "\n%{http_code}\n%{time_total}\n%{content_type}" \
            "$url" 2>&1)
    fi
    
    # レスポンス時間の計算
    end_time=$(date +%s.%N)
    response_time=$(echo "$end_time - $start_time" | bc)
    
    # レスポンスの解析
    if [ $? -eq 0 ]; then
        # 最後の3行を取得（ステータスコード、時間、Content-Type）
        status_code=$(echo "$response" | tail -n 3 | head -n 1)
        curl_time=$(echo "$response" | tail -n 2 | head -n 1)
        content_type=$(echo "$response" | tail -n 1)
        
        # 実際のレスポンス内容（上記3行を除く）
        response_body=$(echo "$response" | head -n -3)
        
        if [ "$status_code" -eq 200 ]; then
            echo -e "${GREEN}✅ $name: $url - OK (${status_code}) - ${curl_time}s${NC}" | tee -a "$LOG_FILE"
            success_count=$((success_count + 1))
            response_times+=("$curl_time")
        else
            echo -e "${RED}❌ $name: $url - エラー (${status_code}) - ${curl_time}s${NC}" | tee -a "$LOG_FILE"
            error_count=$((error_count + 1))
        fi
        
        # Content-Typeの確認
        if [[ "$content_type" == *"application/json"* ]]; then
            echo -e "  ${BLUE}Content-Type: $content_type${NC}" | tee -a "$LOG_FILE"
        elif [[ "$content_type" == *"text/html"* ]]; then
            echo -e "  ${YELLOW}Content-Type: $content_type (HTMLレスポンス)${NC}" | tee -a "$LOG_FILE"
        else
            echo -e "  ${YELLOW}Content-Type: $content_type${NC}" | tee -a "$LOG_FILE"
        fi
        
        # レスポンスサイズの確認
        response_size=$(echo "$response_body" | wc -c)
        echo -e "  ${BLUE}レスポンスサイズ: ${response_size} bytes${NC}" | tee -a "$LOG_FILE"
        
        # JSONレポート用のデータ追加
        if [ $total_count -gt 0 ]; then
            json_results+=","
        fi
        json_results+="{\"name\":\"$name\",\"url\":\"$url\",\"method\":\"$method\",\"status_code\":$status_code,\"response_time\":$curl_time,\"content_type\":\"$content_type\",\"response_size\":$response_size,\"success\":$([ "$status_code" -eq 200 ] && echo "true" || echo "false")}"
        
    else
        echo -e "${RED}❌ $name: $url - 接続エラー${NC}" | tee -a "$LOG_FILE"
        error_count=$((error_count + 1))
        
        # JSONレポート用のデータ追加
        if [ $total_count -gt 0 ]; then
            json_results+=","
        fi
        json_results+="{\"name\":\"$name\",\"url\":\"$url\",\"method\":\"$method\",\"status_code\":0,\"response_time\":0,\"content_type\":\"error\",\"response_size\":0,\"success\":false,\"error\":\"Connection failed\"}"
    fi
    
    total_count=$((total_count + 1))
    echo "" | tee -a "$LOG_FILE"
}

# メイン処理
echo -e "${BLUE}📊 GETリクエストのチェック${NC}"
echo "================================" | tee -a "$LOG_FILE"

for name in "${!endpoints[@]}"; do
    check_endpoint "$name" "${endpoints[$name]}" "GET"
done

echo -e "${BLUE}📊 POSTリクエストのチェック${NC}"
echo "================================" | tee -a "$LOG_FILE"

for name in "${!post_endpoints[@]}"; do
    check_endpoint "$name" "${post_endpoints[$name]}" "POST" '{"name":"テスト部署"}'
done

# 統計の計算
success_rate=$(echo "scale=2; $success_count * 100 / $total_count" | bc)
avg_response_time=$(printf '%s\n' "${response_times[@]}" | awk '{sum+=$1} END {print sum/NR}')

# 結果サマリー
echo -e "${CYAN}📊 チェック結果サマリー${NC}"
echo -e "${CYAN}=======================${NC}"
echo -e "${GREEN}✅ 成功: $success_count${NC}"
echo -e "${RED}❌ エラー: $error_count${NC}"
echo -e "${BLUE}📈 成功率: ${success_rate}%${NC}"
echo -e "${YELLOW}⏱️  平均レスポンス時間: ${avg_response_time}s${NC}"

# エラー詳細
if [ $error_count -gt 0 ]; then
    echo -e "${RED}❌ エラー詳細${NC}"
    echo -e "${RED}=============${NC}"
    grep "❌" "$LOG_FILE" | while read line; do
        echo -e "$line"
    done
fi

# 推奨アクション
echo -e "${CYAN}🎯 推奨アクション${NC}"
if [ $error_count -eq 0 ]; then
    echo -e "${GREEN}• 全てのエンドポイントが正常に動作しています！${NC}"
else
    echo -e "${YELLOW}• エラーが発生したエンドポイントを確認してください${NC}"
    echo -e "${YELLOW}• PM2ログを確認: pm2 logs kintai-backend${NC}"
    echo -e "${YELLOW}• バックエンドを再起動: pm2 restart kintai-backend${NC}"
fi

# JSONレポートの完成
json_results+="]"
echo "$json_results" > "$REPORT_FILE"

# ファイル保存完了の通知
echo -e "${BLUE}📁 ファイル保存完了${NC}"
echo -e "${BLUE}• ログファイル: $LOG_FILE${NC}"
echo -e "${BLUE}• レポートファイル: $REPORT_FILE${NC}"

echo -e "${CYAN}🔍 強力なAPIステータスチェック完了${NC}"
