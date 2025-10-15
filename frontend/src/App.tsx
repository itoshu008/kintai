// frontend/src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import MasterPage from './pages/MasterPage'
import LoginPage from './pages/LoginPage'  // ある場合
// 他のページがあれば import して追加

export default function App() {
  return (
    <Routes>
      {/* 管理トップは必ず MasterPage */}
      <Route path="/" element={<MasterPage />} />

      {/* ログインは /login（必要なら） */}
      <Route path="/login" element={<LoginPage />} />

      {/* どれでもなければトップへ */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}