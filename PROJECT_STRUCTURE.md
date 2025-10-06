# 📁 勤怠管理システム - プロジェクト構成

## 🎯 **プロジェクト概要**
- **フロントエンド**: React + TypeScript + Vite
- **バックエンド**: Node.js + Express + TypeScript
- **データ**: JSONファイルベース（SQLite準備済み）

## 📂 **ディレクトリ構成**

```
kintai/
├── 📁 frontend/                 # フロントエンド（React）
│   ├── 📁 src/
│   │   ├── 📁 pages/           # ページコンポーネント
│   │   │   ├── LoginPage.tsx   # ログインページ
│   │   │   ├── PersonalPage.tsx # 個人勤怠ページ
│   │   │   └── MasterPage.tsx  # 管理者ページ
│   │   ├── 📁 components/      # 共通コンポーネント
│   │   ├── 📁 api/            # API通信
│   │   ├── 📁 contexts/       # React Context
│   │   ├── 📁 lib/            # ライブラリ
│   │   ├── 📁 types/          # 型定義
│   │   └── 📁 utils/          # ユーティリティ
│   ├── package.json
│   └── vite.config.ts
│
├── 📁 backend/                  # バックエンド（Node.js）
│   ├── 📁 src/
│   │   ├── index.ts           # メインサーバー
│   │   ├── 📁 routes/         # APIルート
│   │   ├── 📁 config/         # 設定
│   │   └── 📁 utils/          # ユーティリティ
│   ├── 📁 data/               # データファイル
│   │   ├── employees.json     # 社員データ
│   │   ├── departments.json   # 部署データ
│   │   ├── attendance.json    # 勤怠データ
│   │   └── remarks.json       # 備考データ
│   └── package.json
│
├── 📁 docs/                    # ドキュメント
│   ├── API_ENDPOINTS.md       # API仕様
│   ├── DEPLOYMENT.md          # デプロイ手順
│   └── DEVELOPMENT.md         # 開発手順
│
├── package.json               # ルート設定
├── README.md                  # プロジェクト説明
└── .gitignore                # Git除外設定
```

## 🚀 **主要機能**

### **1. ログインページ** (`/`)
- 社員コード入力
- 管理者/個人の選択

### **2. 個人ページ** (`/personal`)
- 出勤/退勤打刻
- 月別勤怠表示
- 備考入力

### **3. 管理者ページ** (`/admin-dashboard-2024`)
- 全社員勤怠管理
- 部署管理
- 社員登録
- 勤怠打刻代行

## 🔧 **技術スタック**

### **フロントエンド**
- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router DOM

### **バックエンド**
- Node.js
- Express
- TypeScript
- JSONファイル（データベース）

## 📡 **API エンドポイント**

### **認証**
- `POST /api/auth/login` - ログイン

### **勤怠管理**
- `GET /api/admin/master` - 勤怠一覧取得
- `POST /api/clock/in` - 出勤打刻
- `POST /api/clock/out` - 退勤打刻

### **マスタ管理**
- `GET /api/admin/departments` - 部署一覧
- `POST /api/admin/departments` - 部署作成
- `GET /api/admin/employees` - 社員一覧
- `POST /api/admin/employees` - 社員作成

### **備考管理**
- `GET /api/admin/remarks/:code` - 備考取得
- `POST /api/admin/remarks` - 備考保存

## 🎨 **UI/UX特徴**
- レスポンシブデザイン
- リアルタイム更新（5秒間隔）
- 直感的な操作
- 日本語対応

## 🔄 **リアルタイム機能**
- 自動データ更新
- 即座の反映
- ウィンドウフォーカス時更新

