import { Routes, Route, Navigate } from 'react-router-dom'

function PersonalPage() {
  return <div style={{padding:24,fontSize:24}}>👋 PersonalPage は映っています</div>
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/personal" replace />} />
      <Route path="/personal" element={<PersonalPage />} />
      <Route path="*" element={<Navigate to="/personal" replace />} />
    </Routes>
  )
}