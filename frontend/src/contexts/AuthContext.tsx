import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../api/attendance';

// ログインユーザーの情報
export interface LoginUser {
  code: string;
  name: string;
  department?: string;
  isAdmin?: boolean; // 管理者権限
}

// 認証コンテキストの型
interface AuthContextType {
  user: LoginUser | null;
  login: (userData: LoginUser, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  isLoggedIn: boolean;
  isAdmin: boolean;
}

// コンテキストの作成
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// プロバイダーコンポーネント
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<LoginUser | null>(null);

  // 初期化時にサーバーセッションから情報を復元
  useEffect(() => {
    console.log('AuthContext: セッション復元開始');
    const restoreSession = async () => {
      const savedSessionId = localStorage.getItem('sessionId');
      console.log('AuthContext: 保存されたセッションID', savedSessionId);
      
      if (savedSessionId) {
        try {
          const response = await api.getSession(savedSessionId);
          if (response.ok && response.user) {
            console.log('AuthContext: セッション復元成功', response.user);
            setUser(response.user);
          } else {
            console.log('AuthContext: セッション無効、削除');
            localStorage.removeItem('sessionId');
          }
        } catch (error) {
          console.error('セッション復元エラー:', error);
          localStorage.removeItem('sessionId');
        }
      } else {
        console.log('AuthContext: 保存されたセッションIDがありません');
      }
    };

    restoreSession();
  }, []);

  // ログイン処理（バックエンドにセッション保存）
  const login = async (userData: LoginUser, rememberMe = false) => {
    console.log('AuthContext: ログイン処理開始', userData, { rememberMe });
    
    try {
      const response = await api.saveSession({
        code: userData.code,
        name: userData.name,
        department: userData.department || '未設定',
        rememberMe
      });

      if (response.ok && response.sessionId) {
        console.log('AuthContext: セッション保存成功', response);
        setUser(response.user);
        
        if (rememberMe) {
          localStorage.setItem('sessionId', response.sessionId);
          console.log('AuthContext: セッションIDをローカルストレージに保存');
        }
      }
    } catch (error) {
      console.error('ログイン処理エラー:', error);
      throw error;
    }
  };

  // ログアウト処理（バックエンドからセッション削除）
  const logout = async () => {
    const sessionId = localStorage.getItem('sessionId');
    
    try {
      if (sessionId) {
        await api.deleteSession(sessionId);
        console.log('AuthContext: サーバーセッション削除');
      }
    } catch (error) {
      console.error('セッション削除エラー:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('sessionId');
      localStorage.removeItem('employeeCode');
      localStorage.removeItem('employeeName');
      localStorage.removeItem('rememberMe');
      console.log('ログアウト完了');
    }
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isLoggedIn: !!user,
    isAdmin: user?.isAdmin || false
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// カスタムフック
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
