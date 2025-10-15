import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from 'react-router-dom';
import App from "./App";
import { ErrorBoundary } from './components/ErrorBoundary';
// import "./styles.css";

// Vite が注入する base（vite.config.ts の base と一致）
const BASENAME = import.meta.env.BASE_URL || '/';

createRoot(document.getElementById("root")!).render(
  <BrowserRouter basename={BASENAME}>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </BrowserRouter>
);