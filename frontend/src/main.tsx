// グローバル変数の型定義と安全な既定値設定
declare global {
  var isPreview: boolean | undefined;
}

// isPreviewが未定義の場合、安全な既定値を設定
(globalThis as any).isPreview ??= false; // 既定値

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
// import "./styles.css";

createRoot(document.getElementById("root")!).render(<App />);