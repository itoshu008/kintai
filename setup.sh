#!/bin/bash

echo "🚀 勤怠アプリ セットアップ開始"

# 依存関係のインストール
echo "📦 依存関係をインストール中..."
npm install

# Backend セットアップ
echo "🔧 Backend セットアップ中..."
cd backend
npm install

# Backend .env 作成
if [ ! -f .env ]; then
    echo "📝 Backend .env ファイルを作成中..."
    cat > .env << EOF
DB_HOST=127.0.0.1
DB_USER=itoshu
DB_PASSWORD=yourpassword
DB_NAME=attendance
PORT=4021
TZ=Asia/Tokyo
EOF
    echo "✅ Backend .env ファイルを作成しました"
else
    echo "⚠️  Backend .env ファイルは既に存在します"
fi

# Frontend セットアップ
echo "🔧 Frontend セットアップ中..."
cd ../frontend
npm install

# Frontend .env 作成
if [ ! -f .env ]; then
    echo "📝 Frontend .env ファイルを作成中..."
    cat > .env << EOF
VITE_API_BASE_URL=http://127.0.0.1:4021
EOF
    echo "✅ Frontend .env ファイルを作成しました"
else
    echo "⚠️  Frontend .env ファイルは既に存在します"
fi

cd ..

echo "🎉 セットアップ完了！"
echo ""
echo "次のステップ:"
echo "1. MySQL を起動してください"
echo "2. backend/.env の DB設定を確認してください"
echo "3. データベースをセットアップしてください:"
echo "   cd backend && npm run db:setup"
echo "4. npm run dev で開発サーバーを起動してください"
echo ""
echo "URL:"
echo "- Backend: http://localhost:4021"
echo "- Frontend: http://localhost:5173"
echo "- ヘルスチェック: http://localhost:4021/api/health"
echo ""
echo "サンプルトークン:"
echo "- EMP001 (田中太郎)"
echo "- EMP002 (佐藤花子)"
echo "- EMP003 (鈴木一郎)"
echo "- EMP004 (高橋美咲)"
echo "- EMP005 (山田次郎)"
echo ""
echo "個別打刻ページ: http://localhost:5173/p/EMP001"
echo "管理画面: http://localhost:5173/admin/master"
