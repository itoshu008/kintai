import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import MasterPage from './pages/MasterPage';
import PersonalPage from './pages/PersonalPage';
import CursorCommandPage from './pages/CursorCommandPage';

export default function App() {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        const response = await fetch('/api/admin/departments', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        // 5xxエラーまたは接続エラーの場合
        if (response.status >= 500 || !response.ok) {
          console.warn('API接続エラー:', response.status, response.statusText);
          // 一時的にメンテナンス画面を無効化
          setIsMaintenance(false);
        } else {
          setIsMaintenance(false);
        }
      } catch (error) {
        // 接続エラーの場合
        console.error('API接続エラー:', error);
        // 一時的にメンテナンス画面を無効化
        setIsMaintenance(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkApiHealth();
  }, []);

  // メンテナンス画面
  if (isMaintenance) {
    return (
      <div className="maintenance-message">
        <div className="maintenance-content">
          <div className="maintenance-icon">🔧</div>
          <h1>サーバーが一時的にメンテナンス中です。しばらくお待ちください。</h1>
          <p>システムの復旧をお待ちください。</p>
        </div>
      </div>
    );
  }

  // 通常のアプリケーション
  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'auto'
    }}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/m" element={<MasterPage />} />
            <Route path="/master" element={<MasterPage />} />
            <Route path="/p" element={<PersonalPage />} />
            <Route path="/personal" element={<PersonalPage />} />
            <Route path="/cursor-command" element={<CursorCommandPage />} />
            {/* 存在しないパスはログインページにリダイレクト */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}