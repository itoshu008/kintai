# 🔧 Plio デプロイトラブルシューティング

## 🚨 **現在の問題**

TypeScriptビルドエラー:
```
src/pages/MasterPage.tsx(367,73): error TS2554: Expected 2 arguments, but got 4.
```

## 🔍 **問題の原因**

Plioサーバーが最新のコードを取得していない可能性があります。

## ✅ **解決手順**

### **ステップ1: 現状確認**

Plioサーバーで以下のコマンドを実行:

```bash
# 現在のコミット確認
git log --oneline -1

# MasterPage.tsxの3行目を確認（adminApiのインポートがあるべき）
sed -n '3p' frontend/src/pages/MasterPage.tsx

# MasterPage.tsxの368行目を確認（adminApi.updateEmployeeがあるべき）
sed -n '368p' frontend/src/pages/MasterPage.tsx
```

**期待される結果:**
- 3行目: `import { api as adminApi } from '../lib/api';`
- 368行目: `const res = await adminApi.updateEmployee(...)`

---

### **ステップ2: 最新コードの強制取得**

もし上記が正しく表示されない場合、以下を実行:

```bash
# Plioサーバーで実行

# 1. すべてのローカル変更を破棄して最新コードを取得
git fetch origin
git reset --hard origin/main

# 2. 現在のコミットを確認
git log --oneline -3

# 3. 再度確認
sed -n '3p' frontend/src/pages/MasterPage.tsx
sed -n '368p' frontend/src/pages/MasterPage.tsx
```

**期待されるコミット:**
```
4c4fe60 Add diagnostic and force update scripts for Plio deployment
6c54820 Update deploy scripts to fetch latest code and clear TS cache
c04c4e5 Fix TypeScript build error and add Plio deployment scripts
```

---

### **ステップ3: クリーンビルド**

コードが正しい場合、キャッシュをクリアしてビルド:

```bash
# Plioサーバーで実行

# 1. すべてのキャッシュとnode_modulesを削除
rm -rf node_modules
rm -rf frontend/node_modules
rm -rf backend/node_modules
rm -f frontend/tsconfig.tsbuildinfo
rm -f backend/tsconfig.tsbuildinfo

# 2. 依存関係を再インストール
npm install
cd frontend
npm install
cd ..

# 3. フロントエンドビルド
cd frontend
npm run build
cd ..
```

---

### **ステップ4: 完全自動化スクリプト**

上記手順をすべて自動実行:

```bash
# Plioサーバーで実行
chmod +x ploi-force-update.sh
./ploi-force-update.sh
```

---

## 🔍 **詳細診断**

問題が解決しない場合、診断スクリプトを実行:

```bash
chmod +x ploi-diagnose.sh
./ploi-diagnose.sh
```

診断結果をチェック:
- ✅ Git commit が `4c4fe60` または `c04c4e5` 以降か
- ✅ `adminApi import` が見つかるか
- ✅ Line 368 に `adminApi.updateEmployee` があるか

---

## 📞 **緊急対応: ワンライナーコマンド**

すべてを一度に実行:

```bash
cd /home/zatint1991-hvt55/zatint1991.com && \
git fetch origin && \
git reset --hard origin/main && \
rm -rf node_modules frontend/node_modules backend/node_modules && \
rm -f frontend/tsconfig.tsbuildinfo backend/tsconfig.tsbuildinfo && \
npm install && \
cd frontend && npm install && npm run build && cd .. && \
cd backend && npm install && npm run build && cd .. && \
pm2 restart attendance-app && \
echo "✅ Deployment completed!"
```

---

## 🎯 **確認ポイント**

### **1. Gitリポジトリの状態**
```bash
git status
git log --oneline -5
```

### **2. ファイルの内容**
```bash
# adminApiのインポート確認
grep -n "api as adminApi" frontend/src/pages/MasterPage.tsx

# updateEmployee呼び出し確認
grep -n "adminApi.updateEmployee" frontend/src/pages/MasterPage.tsx
```

### **3. TypeScriptキャッシュ**
```bash
find . -name "tsconfig.tsbuildinfo"
# すべて削除すること
```

---

## 🚀 **デプロイ後の確認**

ビルドが成功したら:

```bash
# 1. PM2でプロセス確認
pm2 status

# 2. ヘルスチェック
curl http://localhost:8000/api/health

# 3. ログ確認
pm2 logs attendance-app --lines 50
```

---

## 💡 **トラブルシューティングのヒント**

1. **Gitが最新を取得していない**
   - `git pull` ではなく `git reset --hard origin/main` を使用
   - デプロイスクリプトが実行される前に、手動で最新コードを取得

2. **キャッシュ問題**
   - `node_modules` と `tsconfig.tsbuildinfo` を完全削除
   - `npm install` を再実行

3. **ファイル権限**
   - デプロイスクリプトに実行権限があるか確認
   - `chmod +x *.sh` で権限付与

4. **ディレクトリ確認**
   - 正しいプロジェクトディレクトリにいるか確認
   - `pwd` でカレントディレクトリを確認

---

## 📝 **成功時の出力例**

```
✅ Up to date with origin/main
🔎 Checking MasterPage.tsx line 368:
      const res = await adminApi.updateEmployee(editingEmployee.id, newCode, newName, newDeptId);

🔎 Checking adminApi import:
3:import { api as adminApi } from '../lib/api';

vite v5.x.x building for production...
✓ built in 3.45s
✅ Build completed successfully!
```

---

## 🆘 **それでも解決しない場合**

以下の情報を確認:

```bash
# 1. Node.jsバージョン
node -v  # 18以上必要

# 2. npmバージョン
npm -v

# 3. 完全なビルドログ
cd frontend && npm run build 2>&1 | tee build.log
```

この情報を添えて、サポートに連絡してください。
