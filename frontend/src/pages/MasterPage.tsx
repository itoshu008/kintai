import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { api } from '../api/attendance';
import { api as adminApi } from '../lib/api';
import { MasterRow, Department } from '../types/attendance';
import { isHolidaySync, getHolidayNameSync, isSunday, isSaturday } from '../utils/holidays';
import { BackupManager } from '../components/BackupManager';

// バックアップ関連の型定義
interface BackupItem {
  name: string;
  date: string;
  size: number;
}

const fmtHM = (s?: string|null) => {
  if (!s) return '—';
  const d = new Date(s);
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const z = (n:number)=> String(n).padStart(2,'0');
  return `${hours}:${z(minutes)}`; // 0:00 表記
};

const calcWorkTime = (clockIn?: string|null, clockOut?: string|null) => {
  if (!clockIn || !clockOut) return '—';
  const start = new Date(clockIn);
  const end = new Date(clockOut);
  const diffMs = end.getTime() - start.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const z = (n:number)=> String(n).padStart(2,'0');
  return `${diffHours}:${z(diffMinutes)}`;
};

const calcLateEarly = (late?: number, early?: number) => {
  const lateMin = late || 0;
  const earlyMin = early || 0;
  const total = lateMin + earlyMin;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const z = (n:number)=> String(n).padStart(2,'0');
  return `${hours}:${z(minutes)}`;
};

const calcOvertime = (overtime?: number) => {
  const overtimeMin = overtime || 0;
  const hours = Math.floor(overtimeMin / 60);
  const minutes = overtimeMin % 60;
  const z = (n:number)=> String(n).padStart(2,'0');
  return `${hours}:${z(minutes)}`;
};

const calcNightWork = (clockIn?: string|null, clockOut?: string|null) => {
  if (!clockIn || !clockOut) return '0:00';
  const start = new Date(clockIn);
  const end = new Date(clockOut);
  let totalNightMinutes = 0;
  const current = new Date(start);
  
  while (current < end) {
    const hour = current.getHours();
    
    // 22:00-5:00の深夜時間帯かどうかチェック
    if (hour >= 22 || hour < 5) {
      totalNightMinutes += 1;
    }
    
    // 1分進める
    current.setMinutes(current.getMinutes() + 1);
  }
  
  const hours = Math.floor(totalNightMinutes / 60);
  const minutes = totalNightMinutes % 60;
    const z = (n: number) => String(n).padStart(2, '0');
    return `${hours}:${z(minutes)}`;
};

const calcLegalOvertime = (clockIn?: string|null, clockOut?: string|null) => {
  if (!clockIn || !clockOut) return '0:00';
  const start = new Date(clockIn);
  const end = new Date(clockOut);
  const diffMs = end.getTime() - start.getTime();
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  
  // 8時間（480分）を超えた分が法定外残業
  const legalOvertimeMinutes = totalMinutes - 480;
  const hours = Math.floor(legalOvertimeMinutes / 60);
  const minutes = legalOvertimeMinutes % 60;
  const z = (n: number) => String(n).padStart(2, '0');
  return `${hours}:${z(minutes)}`;
};

export default function MasterPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [data, setData] = useState<MasterRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'attendance' | 'backup'>('attendance');

  // ▼ 追加：ロードの「キー」を1つに集約（依存が増えると再走るのでここに集める）
  const loadKey = useMemo(() => `${date}`, [date]);

  // ▼ 追加：同一キーの連続ロード抑止（StrictMode の二重実行や多重イベントを吸収）
  const lastKeyRef = useRef<string>('');
  const lastTsRef = useRef<number>(0);

  const loadOnce = useCallback(async (key: string) => {
    // 250ms 以内に同じキーならスキップ
    const now = Date.now();
    if (lastKeyRef.current === key && now - lastTsRef.current < 250) {
      console.debug('⚠️ skip duplicate load', key);
      return;
    }
    lastKeyRef.current = key;
    lastTsRef.current = now;

    setLoading(true);
    const ac = new AbortController();
    acRef.current = ac;
    try {
      const res = await api.master(key);
      if (!ac.signal.aborted) {
        setData(res.list || []);
        setMsg('');
      }
    } catch (e:any) {
      if (!ac.signal.aborted) setMsg(String(e.message || e));
    } finally {
      if (acRef.current === ac) acRef.current = null;
      setLoading(false);
    }
  }, []);

  const acRef = useRef<AbortController | null>(null);

  // バックアップ復元時のコールバック
  const handleBackupRestore = () => {
    setMsg('バックアップから復元しました。データを再読み込み中...');
      loadOnce(loadKey);
  };

  // リアルタイム更新（30秒間隔）
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        loadOnce(loadKey);
      }
    }, 30000); // 30秒間隔

    return () => clearInterval(interval);
  }, [loading, loadKey, loadOnce]);

  // 初期ロード
  useEffect(() => {
    loadOnce(loadKey);
  }, [loadKey, loadOnce]);

  return (
    <div style={{
      padding: window.innerWidth <= 768 ? '12px' : '24px', 
      background:'#f8f9fa', 
      minHeight:'100vh',
      overflow: 'auto',
      WebkitOverflowScrolling: 'touch'
    }}>
      {/* タブナビゲーション */}
      <div style={{
                background: 'white', 
              borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '24px',
              overflow: 'hidden'
            }}>
        <div style={{
                    display: 'flex',
          borderBottom: '1px solid #e9ecef'
        }}>
                <button 
            onClick={() => setActiveTab('attendance')}
                  style={{
              flex: 1,
              padding: '16px 24px',
              background: activeTab === 'attendance' ? '#007bff' : 'transparent',
              color: activeTab === 'attendance' ? 'white' : '#495057',
                    border: 'none',
                    cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
                    transition: 'all 0.2s ease'
                  }}
                >
            📊 勤怠管理
                </button>
                <button 
            onClick={() => setActiveTab('backup')}
                  style={{
              flex: 1,
              padding: '16px 24px',
              background: activeTab === 'backup' ? '#007bff' : 'transparent',
              color: activeTab === 'backup' ? 'white' : '#495057',
                    border: 'none',
                    cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
                    transition: 'all 0.2s ease'
                  }}
          >
            💾 バックアップ管理
                </button>
      </div>
      </div>

      {/* タブコンテンツ */}
      {activeTab === 'backup' ? (
        <BackupManager onBackupRestore={handleBackupRestore} />
      ) : (
            <div>
            <div style={{
                display:'flex',
            justifyContent: window.innerWidth <= 768 ? 'center' : 'space-between', 
                alignItems:'center',
            marginBottom: window.innerWidth <= 768 ? '12px' : '24px', 
            padding: window.innerWidth <= 768 ? '12px' : '20px 24px', 
            background:'white', 
            borderRadius: window.innerWidth <= 768 ? '8px' : '12px', 
            boxShadow:'0 2px 8px rgba(0,0,0,0.1)',
            flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
            gap: window.innerWidth <= 768 ? '12px' : '0'
          }}>
            <div style={{display:'flex', alignItems:'center', gap: 24}}>
              <h1 style={{margin:0, fontSize:'28px', fontWeight:'600', color:'#2c3e50'}}>勤怠管理ページ</h1>
              
              {/* 月選択を大きく移動 */}
              <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                <label style={{fontSize: 18, fontWeight: 600, color: '#374151'}}>月選択:</label>
          <input
            type="month"
            value={date.slice(0, 7)}
            onChange={(e) => setDate(e.target.value + '-01')}
            style={{
              padding: '8px 12px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 600,
              color: '#374151',
              background: 'white',
                    cursor: 'pointer'
            }}
          />
        </div>
                              </div>
                              </div>

          {msg && (
          <div style={{
              padding: '12px 20px',
              marginBottom: '20px',
              background: msg.includes('成功') || msg.includes('完了') ? '#d4edda' : '#f8d7da',
              color: msg.includes('成功') || msg.includes('完了') ? '#155724' : '#721c24',
              border: `1px solid ${msg.includes('成功') || msg.includes('完了') ? '#c3e6cb' : '#f5c6cb'}`,
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500'
            }}>
              {msg}
          </div>
        )}

          {loading && (
            <div style={{textAlign: 'center', padding: '40px'}}>
              <div style={{fontSize: '18px', color: '#666'}}>読み込み中...</div>
              </div>
            )}

          {!loading && data.length === 0 && (
            <div style={{textAlign: 'center', padding: '40px', color: '#666'}}>
              <div style={{fontSize: '18px', marginBottom: '10px'}}>📊</div>
              <div>データがありません</div>
          </div>
        )}

          {!loading && data.length > 0 && (
          <div style={{
              background: 'white',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <table style={{
                    width: '100%',
                borderCollapse: 'collapse',
                    fontSize: '14px'
              }}>
                <thead>
                  <tr style={{background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: 'white'}}>
                    <th style={{padding: '16px 12px', textAlign: 'left', fontWeight: 700}}>社員名</th>
                    <th style={{padding: '16px 12px', textAlign: 'center', fontWeight: 700}}>出勤時間</th>
                    <th style={{padding: '16px 12px', textAlign: 'center', fontWeight: 700}}>退勤時間</th>
                    <th style={{padding: '16px 12px', textAlign: 'center', fontWeight: 700}}>勤務時間</th>
                    <th style={{padding: '16px 12px', textAlign: 'center', fontWeight: 700}}>遅刻・早退</th>
                    <th style={{padding: '16px 12px', textAlign: 'center', fontWeight: 700}}>残業時間</th>
                    <th style={{padding: '16px 12px', textAlign: 'center', fontWeight: 700}}>深夜時間</th>
                    <th style={{padding: '16px 12px', textAlign: 'center', fontWeight: 700}}>法定外残業</th>
                    <th style={{padding: '16px 12px', textAlign: 'center', fontWeight: 700}}>状態</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.id} style={{
                      borderBottom: '1px solid #f1f3f4',
                      background: row.status === '出勤中' ? '#f0fff4' : 
                                 (row.late || 0) + (row.early || 0) + (row.overtime || 0) + (row.night || 0) > 0 ? '#fffdf0' : 'transparent'
                    }}>
                      <td style={{padding: '12px', fontWeight: '600'}}>{row.name}</td>
                      <td style={{padding: '12px', textAlign: 'center'}}>{fmtHM(row.clock_in)}</td>
                      <td style={{padding: '12px', textAlign: 'center'}}>{fmtHM(row.clock_out)}</td>
                      <td style={{padding: '12px', textAlign: 'center'}}>{calcWorkTime(row.clock_in, row.clock_out)}</td>
                      <td style={{padding: '12px', textAlign: 'center'}}>{calcLateEarly(row.late, row.early)}</td>
                      <td style={{padding: '12px', textAlign: 'center'}}>{calcOvertime(row.overtime)}</td>
                      <td style={{padding: '12px', textAlign: 'center'}}>{calcNightWork(row.clock_in, row.clock_out)}</td>
                      <td style={{padding: '12px', textAlign: 'center'}}>{calcLegalOvertime(row.clock_in, row.clock_out)}</td>
                      <td style={{padding: '12px', textAlign: 'center'}}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: row.status === '出勤中' ? '#10b981' : 
                                     row.status === '退勤済み' ? '#3b82f6' : '#6b7280',
                          color: 'white'
                        }}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
          )}
          </div>
        )}
    </div>
  );
}