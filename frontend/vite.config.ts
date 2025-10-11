// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

// ビルドバージョン（ISO文字列）を生成
const buildVersion = new Date().toISOString().replace(/[:.]/g, "-");

export default defineConfig({
  plugins: [
    react(),
    // HTMLテンプレートの変換プラグイン
    {
      name: 'html-transform',
      transformIndexHtml(html) {
        return html
          .replace(/__BUILD_VERSION__/g, buildVersion)
          .replace(
            /(<script[^>]*src="[^"]*\.js")/g,
            `$1?v=${buildVersion}`
          )
          .replace(
            /(<link[^>]*href="[^"]*\.css")/g,
            `$1?v=${buildVersion}`
          )
          .replace(
            /(<link[^>]*rel="manifest"[^>]*href="[^"]*")/g,
            `$1?v=${buildVersion}`
          );
      },
      generateBundle(options, bundle) {
        // manifest.jsonをsrc/assetsからコピーして変換
        try {
          const manifestSource = join(process.cwd(), 'src/assets/manifest.json');
          const manifestDest = join(process.cwd(), 'dist/manifest.json');

          // manifest.jsonをコピー
          copyFileSync(manifestSource, manifestDest);

          // 内容を読み込んで変換
          let manifestContent = readFileSync(manifestDest, 'utf8');
          manifestContent = manifestContent.replace(/__BUILD_VERSION__/g, buildVersion);
          writeFileSync(manifestDest, manifestContent, 'utf8');

          console.log('✅ Manifest copied and transformed from src/assets/');
        } catch (error) {
          console.warn('⚠️ Failed to copy manifest.json:', error);
        }
      }
    }
  ],
  define: {
    __BUILD_VERSION__: JSON.stringify(buildVersion),
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@': '/src',
    },
  },
  server: {
    // ポート 3000 に設定（開発サーバー）
    port: 3000,
    strictPort: true, // ポートがすでに使われていたらエラーを出す
    host: true, // 外部からのアクセスを許可
    proxy: {
      // アテンダンス管理API -> 8001
      "/api/admin": {
        target: "http://localhost:8001", // APIサーバーは8001
        changeOrigin: true,
        secure: false,
      },
      // 一般API -> 8001
      "/api": {
        target: "http://localhost:8001", // APIサーバーは8001
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: 4173, // プレビュー用ポート
    strictPort: true,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash]-${Math.random().toString(36).substr(2, 9)}.js`,
        chunkFileNames: `assets/[name]-[hash]-${Math.random().toString(36).substr(2, 9)}.js`,
        assetFileNames: `assets/[name]-[hash]-${Math.random().toString(36).substr(2, 9)}.[ext]`
      }
    }
  },
});
