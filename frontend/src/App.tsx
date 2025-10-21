import { Routes, Route, Navigate } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import PersonalPage from './pages/PersonalPage'  // ← 実ファイル名と完全一致

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Navigate to="/personal" replace />} />
        <Route path="/personal" element={<PersonalPage />} />
        <Route path="*" element={<Navigate to="/personal" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}