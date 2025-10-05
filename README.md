# 🕐 勤怠管理システム (Kintai Management System)

## 📋 **概要**
社員の出退勤管理、勤怠記録、備考管理を行うWebアプリケーションです。

## 🚀 **クイックスタート**

### **1. 依存関係のインストール**
```bash
npm install
```

### **2. 開発サーバー起動**
```bash
npm run dev
```

### **3. アクセス**
- **フロントエンド**: http://localhost:3000
- **バックエンド**: http://localhost:8000

## 🎯 **主要機能**

### **👤 個人ページ** (`/personal`)
- ✅ 出勤/退勤打刻
- 📊 月別勤怠表示
- 📝 備考入力・編集
- 🔄 リアルタイム更新

### **👨‍💼 管理者ページ** (`/admin-dashboard-2024`)
- 👥 全社員勤怠管理
- 🏢 部署管理
- ➕ 社員登録
- ⏰ 勤怠打刻代行
- 📈 勤怠レポート

## 🛠️ **技術スタック**

### **フロントエンド**
- ⚛️ React 18
- 📘 TypeScript
- ⚡ Vite
- 🎨 Tailwind CSS
- 🧭 React Router DOM

### **バックエンド**
- 🟢 Node.js
- 🚀 Express
- 📘 TypeScript
- 📄 JSONファイル（データベース）

## 📁 **プロジェクト構成**

```
kintai/
├── 📁 frontend/          # React フロントエンド
├── 📁 backend/           # Node.js バックエンド
├── 📁 docs/              # ドキュメント
├── 📁 data/              # データファイル
└── 📄 package.json       # ルート設定
```

## 🔧 **開発コマンド**

```bash
# 開発サーバー起動（フロントエンド + バックエンド）
npm run dev

# フロントエンドのみ
npm run dev:frontend

# バックエンドのみ
npm run dev:backend

# ビルド
npm run build
```

## 📡 **API エンドポイント**

### **認証**
- `POST /api/auth/login` - ログイン

### **勤怠管理**
- `GET /api/admin/master` - 勤怠一覧
- `POST /api/clock/in` - 出勤打刻
- `POST /api/clock/out` - 退勤打刻

### **マスタ管理**
- `GET /api/admin/departments` - 部署一覧
- `POST /api/admin/departments` - 部署作成
- `GET /api/admin/employees` - 社員一覧
- `POST /api/admin/employees` - 社員作成

## 🎨 **UI/UX特徴**
- 📱 レスポンシブデザイン
- 🔄 リアルタイム更新（5秒間隔）
- 🎯 直感的な操作
- 🇯🇵 日本語対応
- ⚡ 高速レスポンス

## 📚 **ドキュメント**
- [📁 プロジェクト構成](PROJECT_STRUCTURE.md)
- [🔧 開発手順](docs/DEVELOPMENT.md)
- [🚀 デプロイ手順](docs/DEPLOYMENT.md)
- [📡 API仕様](docs/API_ENDPOINTS.md)

## 🔄 **リアルタイム機能**
- ⚡ 自動データ更新（5秒間隔）
- 🎯 即座の反映
- 👁️ ウィンドウフォーカス時更新
- 💾 ローカルステート同期

## 🎯 **URL構成**
- **ログイン**: `/` または `/login`
- **個人ページ**: `/personal`
- **管理者ページ**: `/admin-dashboard-2024`

## 📊 **データ管理**
- 📄 JSONファイルベース
- 🔄 リアルタイム同期
- 💾 自動バックアップ
- 📈 履歴管理

## 🚀 **デプロイ**
本番環境へのデプロイ手順は [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) を参照してください。

## 🤝 **貢献**
1. このリポジトリをフォーク
2. フィーチャーブランチを作成
3. 変更をコミット
4. プルリクエストを作成

## 📄 **ライセンス**
このプロジェクトはMITライセンスの下で公開されています。