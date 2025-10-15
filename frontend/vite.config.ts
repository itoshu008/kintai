// frontend/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: '/admin-dashboard-2024/',   // ←ここを絶対に固定
  plugins: [react()],
});