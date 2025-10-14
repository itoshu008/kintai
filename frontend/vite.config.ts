// frontend/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";

// __dirname（ESM）対応
const __filename = fileURLToPath(import.meta.url);
const __dirname  = resolve(__filename, "..");

// ビルドバージョン（ISO文字列。: と . を - に置換）
const buildVersion = new Date().toISOString().replace(/[:.]/g, "-");

// すでに ? が付いていない src/href にだけ ?v=... を付与
const addVersionQuery = (attr: "src" | "href") =>
  new RegExp(`(<(?:script|link)[^>]*${attr}="[^"?"]+")(.*?)>`, "g");

export default defineConfig({
  base: "/admin-dashboard-2024/",

  plugins: [
    react(),
    {
      name: "html-transform",
      enforce: "post",
      transformIndexHtml(html) {
        let out = html.replace(/__BUILD_VERSION__/g, buildVersion);
        out = out
          .replace(addVersionQuery("src"), `$1?v=${buildVersion}$2>`)
          .replace(addVersionQuery("href"), `$1?v=${buildVersion}$2>`);
        return out;
      },
      generateBundle() {
        try {
          const source = readFileSync(
            join(__dirname, "src/assets/manifest.json"),
            "utf8"
          ).replace(/__BUILD_VERSION__/g, buildVersion);

          this.emitFile({
            type: "asset",
            fileName: "manifest.json",
            source,
          });

          this.warn("✅ Manifest embedded from src/assets/manifest.json");
        } catch (e) {
          this.warn(`⚠️ Failed to embed manifest.json: ${(e as Error).message}`);
        }
      },
    },
  ],

  define: {
    __BUILD_VERSION__: JSON.stringify(buildVersion),
  },

  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    alias: { "@": resolve(__dirname, "src") },
  },

  server: {
    host: true,
    port: 3001,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8001",
        changeOrigin: true,
        secure: false,
      },
    },
  },

  preview: {
    host: true,
    port: 3001,
    strictPort: true,
  },

  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});