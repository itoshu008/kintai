import React, { useState, useEffect } from 'react';
import { backupApi, BackupInfo, BackupData } from '../api/backup';

interface BackupManagerProps {
  onBackupRestore?: () => void;
}

export const BackupManager: React.FC<BackupManagerProps> = ({ onBackupRestore }) => {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<BackupData | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showDetail, setShowDetail] = useState(false);

  // バックアップ一覧を取得
  const loadBackups = async () => {
    try {
      setLoading(true);
      const response = await backupApi.getBackups();
      if (response.ok) {
        setBackups(response.backups);
      } else {
        setMessage('バックアップ一覧の取得に失敗しました');
      }
    } catch (error) {
      setMessage('バックアップ一覧の取得中にエラーが発生しました');
      console.error('Load backups error:', error);
    } finally {
      setLoading(false);
    }
  };

  // バックアップ作成
  const createBackup = async () => {
    try {
      setLoading(true);
      setMessage('');
      const response = await backupApi.createBackup();
      if (response.ok) {
        setMessage(response.message);
        await loadBackups(); // 一覧を更新
      } else {
        setMessage('バックアップの作成に失敗しました');
      }
    } catch (error) {
      setMessage('バックアップ作成中にエラーが発生しました');
      console.error('Create backup error:', error);
    } finally {
      setLoading(false);
    }
  };

  // バックアップ詳細を取得
  const loadBackupDetail = async (backupId: string) => {
    try {
      setLoading(true);
      const response = await backupApi.getBackupDetail(backupId);
      if (response.ok) {
        setSelectedBackup(response.backup);
        setShowDetail(true);
      } else {
        setMessage('バックアップ詳細の取得に失敗しました');
      }
    } catch (error) {
      setMessage('バックアップ詳細取得中にエラーが発生しました');
      console.error('Load backup detail error:', error);
    } finally {
      setLoading(false);
    }
  };

  // バックアップから復元
  const restoreBackup = async (backupId: string) => {
    if (!confirm('このバックアップから復元しますか？現在のデータは上書きされます。')) {
      return;
    }

    try {
      setLoading(true);
      setMessage('');
      const response = await backupApi.restoreBackup(backupId);
      if (response.ok) {
        setMessage(response.message);
        setShowDetail(false);
        setSelectedBackup(null);
        if (onBackupRestore) {
          onBackupRestore();
        }
      } else {
        setMessage('バックアップの復元に失敗しました');
      }
    } catch (error) {
      setMessage('バックアップ復元中にエラーが発生しました');
      console.error('Restore backup error:', error);
    } finally {
      setLoading(false);
    }
  };

  // バックアップ削除
  const deleteBackup = async (backupId: string) => {
    if (!confirm('このバックアップを削除しますか？この操作は元に戻せません。')) {
      return;
    }

    try {
      setLoading(true);
      setMessage('');
      const response = await backupApi.deleteBackup(backupId);
      if (response.ok) {
        setMessage(response.message);
        await loadBackups(); // 一覧を更新
      } else {
        setMessage('バックアップの削除に失敗しました');
      }
    } catch (error) {
      setMessage('バックアップ削除中にエラーが発生しました');
      console.error('Delete backup error:', error);
    } finally {
      setLoading(false);
    }
  };

  // コンポーネントマウント時にバックアップ一覧を読み込み
  useEffect(() => {
    loadBackups();
  }, []);

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ja-JP');
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (showDetail && selectedBackup) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>バックアップ詳細</h2>
          <button
            onClick={() => {
              setShowDetail(false);
              setSelectedBackup(null);
            }}
            style={{
              padding: '8px 16px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            一覧に戻る
          </button>
        </div>

        <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3>バックアップ情報</h3>
          <p><strong>ID:</strong> {selectedBackup.id}</p>
          <p><strong>作成日時:</strong> {formatDate(selectedBackup.timestamp)}</p>
          <p><strong>社員数:</strong> {selectedBackup.employees.length}人</p>
          <p><strong>部署数:</strong> {selectedBackup.departments.length}部署</p>
          <p><strong>勤怠記録数:</strong> {Object.keys(selectedBackup.attendance).length}件</p>
          <p><strong>備考数:</strong> {Object.keys(selectedBackup.remarks).length}件</p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => restoreBackup(selectedBackup.id)}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? '復元中...' : 'このバックアップから復元'}
          </button>
          <button
            onClick={() => deleteBackup(selectedBackup.id)}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? '削除中...' : 'このバックアップを削除'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>バックアップ管理</h2>
        <button
          onClick={createBackup}
          disabled={loading}
          style={{
            padding: '10px 20px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? '作成中...' : '新しいバックアップを作成'}
        </button>
      </div>

      {message && (
        <div style={{
          padding: '10px',
          marginBottom: '20px',
          background: message.includes('成功') || message.includes('作成') ? '#d4edda' : '#f8d7da',
          color: message.includes('成功') || message.includes('作成') ? '#155724' : '#721c24',
          border: `1px solid ${message.includes('成功') || message.includes('作成') ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px'
        }}>
          {message}
        </div>
      )}

      {loading && !showDetail && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '18px', color: '#666' }}>読み込み中...</div>
        </div>
      )}

      {!loading && backups.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>📁</div>
          <div>バックアップがありません</div>
          <div style={{ fontSize: '14px', marginTop: '5px' }}>「新しいバックアップを作成」ボタンでバックアップを作成できます</div>
        </div>
      )}

      {!loading && backups.length > 0 && (
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>作成日時</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>ID</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #dee2e6' }}>サイズ</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={backup.id} style={{ borderBottom: '1px solid #f1f3f4' }}>
                  <td style={{ padding: '12px' }}>{formatDate(backup.timestamp)}</td>
                  <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px' }}>{backup.id}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{formatSize(backup.size)}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                      <button
                        onClick={() => loadBackupDetail(backup.id)}
                        style={{
                          padding: '6px 12px',
                          background: '#17a2b8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        詳細
                      </button>
                      <button
                        onClick={() => restoreBackup(backup.id)}
                        disabled={loading}
                        style={{
                          padding: '6px 12px',
                          background: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          fontSize: '12px',
                          opacity: loading ? 0.6 : 1
                        }}
                      >
                        復元
                      </button>
                      <button
                        onClick={() => deleteBackup(backup.id)}
                        disabled={loading}
                        style={{
                          padding: '6px 12px',
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          fontSize: '12px',
                          opacity: loading ? 0.6 : 1
                        }}
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
