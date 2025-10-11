// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
    host: true, // 外部からのアクセスを許可
        proxy: {
          // アテンダンス管理API -> 8001
          "/api/admin": {
            target: "http://localhost:8001",
            changeOrigin: true,
            secure: false,
          },
          // 一般API -> 8001
          "/api": {
            target: "http://localhost:8001",
            changeOrigin: true,
            secure: false,
          },
        },
  },
  preview: {
    port: 4173,
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