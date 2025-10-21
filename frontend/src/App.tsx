import { Routes, Route, Navigate } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import MasterPage from './pages/MasterPage'
import LoginPage from './pages/LoginPage'
import PersonalPage from './pages/PersonalPage'

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<MasterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/personal" element={<PersonalPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}