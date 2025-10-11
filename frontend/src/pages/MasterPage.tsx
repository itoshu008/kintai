import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/attendance';
import { api as adminApi } from '../lib/api';
import { Department, MasterRow } from '../types/attendance';
import { getHolidayNameSync, isHolidaySync } from '../utils/holidays';

// バックアップ関連の型定義
interface BackupItem {
  name: string;
  date: string;
  size: number;
}

const fmtHM = (s?: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const z = (n: number) => String(n).padStart(2, '0');
  return `${hours}:${z(minutes)}`; // 0:00 表記
};

const calcWorkTime = (clockIn?: string | null, clockOut?: string | null) => {
  if (!clockIn || !clockOut) return '—';
  const start = new Date(clockIn);
  const end = new Date(clockOut);
  const diffMs = end.getTime() - start.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const z = (n: number) => String(n).padStart(2, '0');
  return `${diffHours}:${z(diffMinutes)}`;
};

const calcLateEarly = (late?: number, early?: number) => {
  const lateMin = late || 0;
  const earlyMin = early || 0;
  const total = lateMin + earlyMin;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const z = (n: number) => String(n).padStart(2, '0');
  return `${hours}:${z(minutes)}`;
};

const calcOvertime = (overtime?: number) => {
  const overtimeMin = overtime || 0;
  const hours = Math.floor(overtimeMin / 60);
  const minutes = overtimeMin % 60;
  const z = (n: number) => String(n).padStart(2, '0');
  return `${hours}:${z(minutes)}`;
};

// 法定内時間外労働の計算（8時間超〜10時間30分まで）
const calcLegalOvertime = (clockIn?: string | null, clockOut?: string | null) => {
  if (!clockIn || !clockOut) return '0:00';
  const start = new Date(clockIn);
  const end = new Date(clockOut);
  const diffMs = end.getTime() - start.getTime();
  const totalMinutes = Math.floor(diffMs / (1000 * 60));

  // 8h超〜10h30分(480〜630分)を法定内時間外労働として計上
  if (totalMinutes > 480 && totalMinutes <= 630) {
    const legalOvertimeMinutes = totalMinutes - 480;
    const hours = Math.floor(legalOvertimeMinutes / 60);
    const minutes = legalOvertimeMinutes % 60;
    const z = (n: number) => String(n).padStart(2, '0');
    return `${hours}:${z(minutes)}`;
  }
  return '0:00';
};

// 法定外時間外労働の計算（10時間30分を超える残業時間）
const calcIllegalOvertime = (clockIn?: string | null, clockOut?: string | null) => {
  if (!clockIn || !clockOut) return '0:00';
  const start = new Date(clockIn);
  const end = new Date(clockOut);
  const diffMs = end.getTime() - start.getTime();
  const totalMinutes = Math.floor(diffMs / (1000 * 60));

  // 10時間30分(630分)を超えた分を法定外時間外労働として計上
  const illegalOvertimeMinutes = Math.max(0, totalMinutes - 630);
  const hours = Math.floor(illegalOvertimeMinutes / 60);
  const minutes = illegalOvertimeMinutes % 60;
  const z = (n: number) => String(n).padStart(2, '0');
  return `${hours}:${z(minutes)}`;
};


export default function MasterPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<MasterRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  // ▼ 追加：ロードの「キー」を1つに集約（依存が増えると再走るのでここに集める）
  const loadKey = useMemo(() => `${date}`, [date]);

  // ▼ 追加：同一キーの連続ロード抑止（StrictMode の二重実行や多重イベントを吸収）
  const lastKeyRef = useRef<string>('');
  const lastTsRef = useRef<number>(0);
  const acRef = useRef<AbortController | null>(null);

  const loadOnce = useCallback(async (key: string) => {
    // 250ms 以内に同じキーならスキップ
    const now = Date.now();
    if (lastKeyRef.current === key && now - lastTsRef.current < 250) {
      console.debug('⚠️ skip duplicate load', key);
      return;
    }
    lastKeyRef.current = key;
    lastTsRef.current = now;

    // 以前のリクエストを中断
    if (acRef.current) acRef.current.abort();
    const ac = new AbortController();
    acRef.current = ac;

    setLoading(true);
    try {
      const d = key;
      console.debug('Loading month:', d); // ← ここは1回だけ出るようになる
      const res = await api.master(d, undefined);
      if (!ac.signal.aborted) setData(res.list || []);
      if (!ac.signal.aborted) setMsg('');
    } catch (e: any) {
      if (!ac.signal.aborted) setMsg(String(e.message || e));
    } finally {
      if (acRef.current === ac) acRef.current = null;
      setLoading(false);
    }
  }, []);

  // ▼ 「この1本だけ」で読み込む。依存は loadKey のみ！
  useEffect(() => {
    loadOnce(loadKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadKey]);

  // 社員登録フォーム
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDepartment, setNewDepartment] = useState('');

  // 部署フィルター
  const [deps, setDeps] = useState<Department[]>([]);
  const [depFilter, setDepFilter] = useState<number | null>(null);
  const [newDeptName, setNewDeptName] = useState('');

  // ドロップダウンメニュー
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDeptManagement, setShowDeptManagement] = useState(false);
  const [showEmployeeRegistration, setShowEmployeeRegistration] = useState(false);
  const [showEmployeeEditMenu, setShowEmployeeEditMenu] = useState(false);


  // 選択された社員の詳細表示
  const [selectedEmployee, setSelectedEmployee] = useState<MasterRow | null>(null);
  const [employeeDetails, setEmployeeDetails] = useState<MasterRow[]>([]);

  // 社員編集用の状態
  const [editingEmployee, setEditingEmployee] = useState<MasterRow | null>(null);
  const [editEmployeeCode, setEditEmployeeCode] = useState('');
  const [editEmployeeName, setEditEmployeeName] = useState('');
  const [editEmployeeDept, setEditEmployeeDept] = useState<number>(0);
  const [showEmployeeEditModal, setShowEmployeeEditModal] = useState(false);

  // 社員削除用の状態
  const [showEmployeeDeleteMenu, setShowEmployeeDeleteMenu] = useState(false);
  const [deleteTargetEmployee, setDeleteTargetEmployee] = useState<MasterRow | null>(null);

  // 備考管理
  const [remarks, setRemarks] = useState<{ [key: string]: string }>({});

  // 部署編集用の状態
  const [editingDepartment, setEditingDepartment] = useState<{ id: number; name: string } | null>(null);
  const [editDeptName, setEditDeptName] = useState('');

  // 勤怠時間修正用の状態
  const [showTimeEditModal, setShowTimeEditModal] = useState(false);
  const [editingTimeData, setEditingTimeData] = useState<{
    employee: MasterRow;
    date: string;
    clockIn: string;
    clockOut: string;
  } | null>(null);

  // バックアップ管理用の状態
  const [showBackupManagement, setShowBackupManagement] = useState(false);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);

  // 備考保存（サーバーに保存）
  const onSaveRemark = async (targetDate: string, remark: string) => {
    if (!selectedEmployee) return;
    try {
      await api.saveRemark(selectedEmployee.code, targetDate, remark);

      // ローカルステートも即座に更新
      const key = `${targetDate}-${selectedEmployee.code}`;
      setRemarks(prev => ({ ...prev, [key]: remark }));

      setMsg(`✅ ${targetDate}の備考を保存しました`);

      // 即座に最新データを再読み込み（リアルタイム反映）
      setTimeout(async () => {
        try {
          const month = date.slice(0, 7);
          await loadEmployeeMonthlyData(selectedEmployee.code, month);
        } catch (e) {
          console.error('備考保存後の再読み込みエラー:', e);
        }
      }, 100);
    } catch (e: any) {
      setMsg(`❌ 備考保存エラー: ${e?.message ?? e}`);
    }
  };

  // 勤怠時間修正の保存
  const saveTimeEdit = async () => {
    if (!editingTimeData) return;

    try {
      setLoading(true);

      // APIエンドポイントが存在しないため、現在はメッセージのみ表示
      // 実際の実装では、勤怠時間修正用のAPIエンドポイントを呼び出す
      setMsg(`${editingTimeData.employee.name}の勤怠時間を修正しました`);

      setShowTimeEditModal(false);
      setEditingTimeData(null);

      // データを再読み込み
      loadOnce(loadKey);
    } catch (error) {
      console.error('勤怠時間修正エラー:', error);
      setMsg('❌ 勤怠時間の修正に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 時間修正モーダルのキャンセル
  const cancelTimeEdit = () => {
    setShowTimeEditModal(false);
    setEditingTimeData(null);
  };

  // 深夜勤務時間計算（勤務時間内の22:00～5:00）
  const calcNightWorkTime = (clockIn?: string | null, clockOut?: string | null) => {
    if (!clockIn || !clockOut) return '0:00';

    const start = new Date(clockIn);
    const end = new Date(clockOut);

    let totalNightMinutes = 0;

    // 勤務時間を1分刻みでチェックし、深夜時間帯（22:00-5:00）の分数をカウント
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

  // PersonalPageと同じ時間計算関数
  const calcOvertimeFromTimes = (clockIn?: string | null, clockOut?: string | null) => {
    if (!clockIn || !clockOut) return '0:00';
    const start = new Date(clockIn);
    const end = new Date(clockOut);
    const workMs = end.getTime() - start.getTime();
    const workMinutes = Math.floor(workMs / (1000 * 60));
    const overtimeMinutes = Math.max(0, workMinutes - 480); // 8時間を超えた分
    const hours = Math.floor(overtimeMinutes / 60);
    const minutes = overtimeMinutes % 60;
    const z = (n: number) => String(n).padStart(2, '0');
    return `${hours}:${z(minutes)}`;
  };

  const calcLegalOvertime = (clockIn?: string | null, clockOut?: string | null) => {
    if (!clockIn || !clockOut) return '0:00';
    const start = new Date(clockIn);
    const end = new Date(clockOut);
    const workMs = end.getTime() - start.getTime();
    const workMinutes = Math.floor(workMs / (1000 * 60));
    const legalOvertimeMinutes = Math.min(Math.max(0, workMinutes - 480), 120); // 8-10時間の分
    const hours = Math.floor(legalOvertimeMinutes / 60);
    const minutes = legalOvertimeMinutes % 60;
    const z = (n: number) => String(n).padStart(2, '0');
    return `${hours}:${z(minutes)}`;
  };

  const calcIllegalOvertimeFromTimes = (clockIn?: string | null, clockOut?: string | null) => {
    if (!clockIn || !clockOut) return '0:00';
    const start = new Date(clockIn);
    const end = new Date(clockOut);
    const workMs = end.getTime() - start.getTime();
    const workMinutes = Math.floor(workMs / (1000 * 60));
    const illegalOvertimeMinutes = Math.max(0, workMinutes - 630); // 10時間30分を超えた分
    const hours = Math.floor(illegalOvertimeMinutes / 60);
    const minutes = illegalOvertimeMinutes % 60;
    const z = (n: number) => String(n).padStart(2, '0');
    return `${hours}:${z(minutes)}`;
  };

  useEffect(() => {
    // 日付が変更されたら選択された社員の詳細をクリア
    setSelectedEmployee(null);
    setEmployeeDetails([]);
  }, [date]);

  // 選択された社員の月別データを取得
  const loadEmployeeMonthlyData = async (employeeCode: string, month: string) => {
    try {
      const year = new Date(month + '-01').getFullYear();
      const monthNum = new Date(month + '-01').getMonth();
      const daysInMonth = new Date(year, monthNum + 1, 0).getDate();
      const monthlyData: MasterRow[] = [];

      // 月の各日のデータを取得
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(monthNum + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        try {
          const res = await api.master(dateStr);
          const employeeData = res.list?.find((emp: MasterRow) => emp.code === employeeCode);
          if (employeeData) {
            monthlyData.push({ ...employeeData, date: dateStr });
          }
        } catch (error) {
          console.error(`${dateStr}のデータ取得エラー:`, error);
        }
      }

      setEmployeeDetails(monthlyData);
    } catch (error) {
      console.error('月別データ取得エラー:', error);
    }
  };

  // 社員編集関数
  const startEditEmployee = (employee: MasterRow) => {
    setEditingEmployee(employee);
    setEditEmployeeCode(employee.code);
    setEditEmployeeName(employee.name);
    setEditEmployeeDept((employee as any).department_id || 0);
    setShowEmployeeEditModal(true);
  };

  const cancelEditEmployee = () => {
    setEditingEmployee(null);
    setEditEmployeeCode('');
    setEditEmployeeName('');
    setEditEmployeeDept(0);
    setShowEmployeeEditModal(false);
  };


  const saveEmployeeEdit = async () => {
    if (!editingEmployee || !editEmployeeCode.trim() || !editEmployeeName.trim()) {
      setMsg('社員コードと名前を入力してください');
      return;
    }

    try {
      setLoading(true);
      const newCode = editEmployeeCode.trim();
      const newName = editEmployeeName.trim();
      const newDeptId = editEmployeeDept || undefined;

      const res = await adminApi.updateEmployee(editingEmployee.id, newCode, newName, newDeptId);

      if (res.ok) {
        setMsg(`✅ 社員「${editEmployeeName}」を更新しました`);
        cancelEditEmployee();
        setShowEmployeeEditModal(false);

        // 即座にデータを再読み込み（リアルタイム反映）
        await loadOnce(loadKey);

        // さらに即座に最新データを再読み込み
        setTimeout(async () => {
          try {
            await loadOnce(loadKey);
          } catch (e) {
            console.error('社員更新後の再読み込みエラー:', e);
          }
        }, 100);
      } else {
        setMsg(`❌ 社員更新エラー: ${res.error || '不明なエラー'}`);
      }
    } catch (error: any) {
      console.error('社員更新エラー:', error);
      setMsg(`❌ 社員更新エラー: ${error.message || '不明なエラー'}`);
    } finally {
      setLoading(false);
    }
  };

  // 社員削除機能
  const deleteEmployee = async () => {
    if (!deleteTargetEmployee) return;

    if (!confirm(`本当に「${deleteTargetEmployee.name} (${deleteTargetEmployee.code})」を削除しますか？\n\nこの操作は取り消せません。`)) {
      return;
    }

    try {
      setLoading(true);
      const result = await api.deleteEmployee(deleteTargetEmployee.id);

      if (result.ok) {
        setMsg(`社員を削除しました: ${deleteTargetEmployee.name} (${deleteTargetEmployee.code})`);
        setDeleteTargetEmployee(null);
        setShowEmployeeDeleteMenu(false);
        loadOnce(loadKey);
      } else {
        setMsg(`削除エラー: ${result.error}`);
      }
    } catch (error: any) {
      setMsg(`削除エラー: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 社員選択時に月別データを取得
  useEffect(() => {
    if (selectedEmployee) {
      const month = date.slice(0, 7); // YYYY-MM形式
      loadEmployeeMonthlyData(selectedEmployee.code, month);
    }
  }, [selectedEmployee, date]);


  // 部署一覧を初期読み込み
  useEffect(() => {
    loadDeps();
  }, []);

  // バックアップ管理画面を開いた時にバックアップ一覧を読み込み
  useEffect(() => {
    if (showBackupManagement) {
      loadBackups();
    }
  }, [showBackupManagement]);

  // クリック外部でドロップダウンを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-dropdown]')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  // リアルタイム更新（30秒間隔）
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        loadOnce(loadKey);
      }
    }, 30000); // 30秒間隔

    return () => clearInterval(interval);
  }, [loading, loadKey, loadOnce]);

  const onCreate = async () => {
    if (!newCode.trim() || !newName.trim()) {
      setMsg('社員番号、氏名を入力してください');
      return;
    }
    try {
      // 部署IDを取得
      const deptId = deps.find(d => d.name === newDepartment.trim())?.id;
      await adminApi.createEmployee(newCode.trim(), newName.trim(), deptId);
      setNewCode(''); setNewName(''); setNewDepartment('');
      setMsg('✅ 社員を登録しました');

      // 即座にデータを更新（リアルタイム反映）
      await loadOnce(loadKey);

      // さらに即座に最新データを再読み込み
      setTimeout(async () => {
        try {
          await loadOnce(loadKey);
        } catch (e) {
          console.error('社員作成後の再読み込みエラー:', e);
        }
      }, 100);
    } catch (e: any) {
      setMsg(`❌ 社員登録エラー: ${e.message}`);
    }
  };

  const onClock = async (code: string, kind: 'in' | 'out') => {
    try {
      if (kind === 'in') await api.clockIn(code);
      else await api.clockOut(code);

      // 即座にデータを更新（リアルタイム反映）
      await loadOnce(loadKey);

      // さらに即座に最新データを再読み込み
      setTimeout(async () => {
        try {
          await loadOnce(loadKey);
        } catch (e) {
          console.error('打刻後の再読み込みエラー:', e);
        }
      }, 100);
    } catch (e: any) {
      setMsg(`❌ 打刻エラー: ${e.message}`);
    }
  };

  const onCreateDepartment = async () => {
    if (!newDeptName.trim()) {
      setMsg('部署名を入力してください');
      return;
    }
    try {
      await adminApi.createDepartment(newDeptName.trim());
      setNewDeptName('');
      setMsg('✅ 部署を登録しました');

      // 即座に部署リストを更新（リアルタイム反映）
      await loadDeps();

      // さらに即座に最新データを再読み込み
      setTimeout(async () => {
        try {
          await loadDeps();
        } catch (e) {
          console.error('部署作成後の再読み込みエラー:', e);
        }
      }, 100);
    } catch (e: any) {
      setMsg(`❌ 部署登録エラー: ${e.message}`);
    }
  };

  const loadDeps = async () => {
    try {
      const r = await adminApi.listDepartments();
      setDeps(r?.list || []);
    } catch (e: any) {
      console.warn('Failed to load departments:', e);
      setDeps([]);
    }
  };

  // バックアップ一覧を読み込み
  const loadBackups = async () => {
    try {
      setBackupLoading(true);
      const response = await fetch('http://localhost:8001/api/admin/backups');
      const result = await response.json();
      if (result.ok) {
        setBackups(result.backups || []);
      } else {
        setMsg(`❌ バックアップ一覧取得エラー: ${result.error}`);
      }
    } catch (e: any) {
      setMsg(`❌ バックアップ一覧取得エラー: ${e.message}`);
    } finally {
      setBackupLoading(false);
    }
  };

  // 手動バックアップ作成
  const createManualBackup = async () => {
    try {
      setBackupLoading(true);
      const response = await fetch('http://localhost:8001/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      if (result.ok) {
        setMsg(`✅ バックアップを作成しました: ${result.backupName}`);
        loadBackups(); // 一覧を更新
      } else {
        setMsg(`❌ バックアップ作成エラー: ${result.error}`);
      }
    } catch (e: any) {
      setMsg(`❌ バックアップ作成エラー: ${e.message}`);
    } finally {
      setBackupLoading(false);
    }
  };

  // バックアップ復元
  const restoreBackup = async (backupName: string) => {
    if (!confirm(`バックアップ「${backupName}」を復元しますか？\n現在のデータは上書きされます。`)) {
      return;
    }

    try {
      setBackupLoading(true);
      const response = await fetch(`http://localhost:8001/api/admin/backups/${backupName}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupName })
      });
      const result = await response.json();
      if (result.ok) {
        setMsg(`✅ バックアップを復元しました: ${backupName}`);
        loadBackups(); // 一覧を更新
        loadOnce(loadKey); // データを再読み込み
      } else {
        setMsg(`❌ バックアップ復元エラー: ${result.error}`);
      }
    } catch (e: any) {
      setMsg(`❌ バックアップ復元エラー: ${e.message}`);
    } finally {
      setBackupLoading(false);
    }
  };

  // バックアップ削除
  const deleteBackup = async (backupName: string) => {
    if (!confirm(`バックアップ「${backupName}」を削除しますか？\nこの操作は元に戻せません。`)) {
      return;
    }

    try {
      setBackupLoading(true);
      const response = await fetch(`http://localhost:8001/api/admin/backups/${backupName}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupName })
      });
      const result = await response.json();
      if (result.ok) {
        setMsg(`✅ バックアップを削除しました: ${backupName}`);
        loadBackups(); // 一覧を更新
      } else {
        setMsg(`❌ バックアップ削除エラー: ${result.error}`);
      }
    } catch (e: any) {
      setMsg(`❌ バックアップ削除エラー: ${e.message}`);
    } finally {
      setBackupLoading(false);
    }
  };

  // 部署編集開始
  const onStartEditDepartment = (dept: { id: number; name: string }) => {
    setEditingDepartment(dept);
    setEditDeptName(dept.name);
  };

  // 部署編集キャンセル
  const onCancelEditDepartment = () => {
    setEditingDepartment(null);
    setEditDeptName('');
  };

  // 部署名更新
  const onUpdateDepartment = async () => {
    if (!editingDepartment || !editDeptName.trim()) {
      setMsg('部署名を入力してください');
      return;
    }
    try {
      await adminApi.updateDepartment(editingDepartment.id, editDeptName.trim());
      setMsg('✅ 部署名を更新しました');

      // 即座に部署リストを更新（リアルタイム反映）
      await loadDeps();

      // さらに即座に最新データを再読み込み
      setTimeout(async () => {
        try {
          await loadDeps();
        } catch (e) {
          console.error('部署更新後の再読み込みエラー:', e);
        }
      }, 100);

      // 編集状態をリセット
      setEditingDepartment(null);
      setEditDeptName('');
    } catch (e: any) {
      setMsg(`❌ 部署更新エラー: ${e.message}`);
    }
  };

  // 部署削除
  const onDeleteDepartment = async (id: number, name: string) => {
    if (!confirm(`⚠️ 部署削除の確認\n\n部署「${name}」を削除しますか？\n\n🚨 重要な注意:\n• この部署に所属する社員も全て削除されます\n• 削除された社員の勤怠データも失われます\n• この操作は取り消せません\n\n本当に削除しますか？`)) {
      return;
    }
    try {
      await adminApi.deleteDepartment(id);
      setMsg('✅ 部署「' + name + '」を削除しました');
      loadDeps();
    } catch (e: any) {
      setMsg(`❌ 部署削除エラー: ${e.message}`);
    }
  };

  // 社員を選択して詳細データを取得（高速化）
  const selectEmployee = async (employee: MasterRow) => {
    setSelectedEmployee(employee);
    setLoading(true);
    try {
      const month = date.slice(0, 7); // YYYY-MM形式
      console.log('Selecting employee for month:', month);

      // 日付の配列を生成（1日から月末まで）
      const dates = [];
      const year = parseInt(month.split('-')[0]);
      const monthNum = parseInt(month.split('-')[1]) - 1;
      const daysInMonth = new Date(year, monthNum + 1, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(monthNum + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dates.push(dateStr);
      }

      // バッチ処理で高速化（10日ずつ処理）
      const batchSize = 10;
      const batches = [];
      for (let i = 0; i < dates.length; i += batchSize) {
        batches.push(dates.slice(i, i + batchSize));
      }

      const allDetails = [];
      for (const batch of batches) {
        const promises = batch.map(dateStr =>
          api.master(dateStr).catch(e => {
            console.warn(`Failed to load data for ${dateStr}:`, e);
            return { list: [] };
          })
        );
        const results = await Promise.all(promises);
        allDetails.push(...results.flatMap((r, batchIndex) =>
          (r.list || []).map(row => ({
            ...row,
            date: batch[batchIndex] // 対応する日付を追加
          }))
        ));
      }

      const filteredDetails = allDetails.filter(row => row.code === employee.code);
      setEmployeeDetails(filteredDetails);
    } catch (e: any) {
      setMsg(String(e.message));
    } finally {
      setLoading(false);
    }
  };

  const sorted = useMemo(() => {
    if (!data) return [];

    // 部署フィルターによる絞り込み
    let filtered = data;
    if (depFilter !== null) {
      filtered = data.filter(r => (r as any).department_id === depFilter);
    }

    // デフォルトはコード順
    return [...filtered].sort((a, b) => a.code.localeCompare(b.code));
  }, [data, depFilter]);

  return (
    <div style={{
      padding: window.innerWidth <= 768 ? '12px' : '24px',
      background: '#000000',
      minHeight: '100vh',
      overflow: 'auto',
      WebkitOverflowScrolling: 'touch'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: window.innerWidth <= 768 ? 'center' : 'space-between',
        alignItems: 'center',
        marginBottom: window.innerWidth <= 768 ? '12px' : '24px',
        padding: window.innerWidth <= 768 ? '12px' : '20px 24px',
        background: 'white',
        borderRadius: window.innerWidth <= 768 ? '8px' : '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
        gap: window.innerWidth <= 768 ? '12px' : '0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '600', color: '#ffffff' }}>勤怠管理ページ</h1>

          {/* 月選択を大きく移動 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ fontSize: 18, fontWeight: 600, color: '#ffffff' }}>月選択:</label>
            <input
              type="month"
              value={date.slice(0, 7)}
              onChange={(e) => setDate(e.target.value + '-01')}
              style={{
                padding: '12px 16px',
                border: '2px solid #d1d5db',
                borderRadius: 8,
                fontSize: 18,
                fontWeight: 500,
                color: '#374151',
                background: 'white',
                cursor: 'pointer',
                minWidth: 200,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            />
          </div>
        </div>

        {/* 再読込ボタンとメニュー */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: window.innerWidth <= 768 ? '8px' : '16px',
          flexWrap: 'wrap',
          justifyContent: window.innerWidth <= 768 ? 'center' : 'flex-start'
        }}>
          {/* 再読込ボタン */}
          <button
            onClick={() => loadOnce(loadKey)}
            disabled={loading}
            style={{
              padding: window.innerWidth <= 768 ? '8px 16px' : '12px 20px',
              background: loading ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: window.innerWidth <= 768 ? '14px' : '16px',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              minHeight: '44px'
            }}
          >
            {loading ? '更新中...' : '🔄 再読込'}
          </button>


          {/* 右上のドロップダウンメニューボタン */}
          <div style={{ position: 'relative' }} data-dropdown>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              style={{
                padding: '12px 20px',
                background: showDropdown ? '#0056b3' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                boxShadow: '0 2px 4px rgba(0,123,255,0.3)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#0056b3'}
              onMouseLeave={(e) => e.currentTarget.style.background = showDropdown ? '#0056b3' : '#007bff'}
            >
              <span style={{ fontSize: '16px' }}>☰</span>
              メニュー
            </button>

            {/* ドロップダウンメニュー */}
            {showDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                background: 'white',
                border: '1px solid #e9ecef',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                zIndex: 1000,
                minWidth: '220px',
                marginTop: '8px',
                overflow: 'hidden'
              }}>
                <div style={{ padding: '4px 0' }}>
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      setShowDeptManagement(!showDeptManagement);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#495057',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontSize: '16px' }}>📁</span>
                    部署管理
                  </button>
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      setShowEmployeeRegistration(!showEmployeeRegistration);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#495057',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontSize: '16px' }}>👤</span>
                    社員登録
                  </button>
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      setShowEmployeeEditMenu(!showEmployeeEditMenu);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#495057',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontSize: '16px' }}>✏️</span>
                    社員情報変更
                  </button>
                  <div style={{ height: '1px', background: '#e9ecef', margin: '4px 0' }}></div>
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      setShowEmployeeDeleteMenu(true);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#dc3545',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#fff5f5'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontSize: '16px' }}>🗑️</span>
                    社員削除
                  </button>
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      setShowBackupManagement(true);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#17a2b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#e6f7ff'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontSize: '16px' }}>💾</span>
                    バックアップ管理
                  </button>
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      // ヘルプ機能
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#6c757d',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontSize: '16px' }}>❓</span>
                    ヘルプ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* 部署管理・フィルター */}
      {showDeptManagement && (
        <div style={{ marginBottom: 24, padding: 24, border: '1px solid #007bff', borderRadius: 12, background: 'linear-gradient(135deg, #f8f9ff 0%, #e3f2fd 100%)', boxShadow: '0 4px 12px rgba(0,123,255,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, color: '#007bff', fontSize: '18px', fontWeight: '600' }}>部署管理</h3>
            <button
              onClick={() => setShowDeptManagement(false)}
              style={{
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#c82333'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#dc3545'}
            >
              ×
            </button>
          </div>

          {/* 部署登録 */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: '500', color: '#495057', fontSize: '14px' }}>部署名</label>
              <input
                placeholder="部署名を入力してください"
                value={newDeptName}
                onChange={e => setNewDeptName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: 8,
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#007bff'}
                onBlur={(e) => e.target.style.borderColor = '#ced4da'}
              />
            </div>
            <button
              onClick={onCreateDepartment}
              style={{
                padding: '10px 20px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontWeight: '500',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,123,255,0.3)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#0056b3'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#007bff'}
            >
              部署を追加
            </button>
          </div>


          {/* 部署一覧 */}
          <div>
            <h4 style={{ marginBottom: 8, color: '#495057', fontSize: '16px', fontWeight: '500' }}>部署一覧</h4>
            <p style={{ marginBottom: 12, color: '#6c757d', fontSize: '13px', fontStyle: 'italic' }}>
              💡 各部署の「編集」ボタンで名前変更、「🗑️ 削除」ボタンで部署削除ができます
            </p>
            <div style={{ display: 'grid', gap: 8 }}>
              {deps.map(dept => (
                <div key={dept.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  background: 'white',
                  border: '1px solid #e9ecef',
                  borderRadius: 8,
                  transition: 'all 0.2s ease'
                }}>
                  {editingDepartment?.id === dept.id ? (
                    <>
                      <input
                        value={editDeptName}
                        onChange={e => setEditDeptName(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          border: '1px solid #007bff',
                          borderRadius: 6,
                          fontSize: '14px'
                        }}
                        onKeyPress={e => e.key === 'Enter' && onUpdateDepartment()}
                        autoFocus
                      />
                      <button
                        onClick={onUpdateDepartment}
                        style={{
                          padding: '6px 12px',
                          background: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        保存
                      </button>
                      <button
                        onClick={onCancelEditDepartment}
                        style={{
                          padding: '6px 12px',
                          background: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        キャンセル
                      </button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1, fontSize: '14px', color: '#495057' }}>{dept.name}</span>
                      <button
                        onClick={() => onStartEditDepartment(dept)}
                        style={{
                          padding: '6px 12px',
                          background: '#ffc107',
                          color: '#212529',
                          border: 'none',
                          borderRadius: 6,
                          fontSize: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#e0a800'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#ffc107'}
                      >
                        編集
                      </button>
                      <button
                        onClick={() => onDeleteDepartment(dept.id, dept.name)}
                        style={{
                          padding: '8px 16px',
                          background: '#dc3545',
                          color: 'white',
                          border: '2px solid #dc3545',
                          borderRadius: 8,
                          fontSize: '13px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 4px rgba(220,53,69,0.3)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#c82333';
                          e.currentTarget.style.borderColor = '#c82333';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(220,53,69,0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#dc3545';
                          e.currentTarget.style.borderColor = '#dc3545';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(220,53,69,0.3)';
                        }}
                      >
                        🗑️ 削除
                      </button>
                    </>
                  )}
                </div>
              ))}
              {deps.length === 0 && (
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#6c757d',
                  fontSize: '14px',
                  background: '#f8f9fa',
                  borderRadius: 8,
                  border: '1px dashed #dee2e6'
                }}>
                  部署が登録されていません
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 社員登録フォーム */}
      {showEmployeeRegistration && (
        <div style={{ marginBottom: 24, padding: 24, border: '1px solid #28a745', borderRadius: 12, background: 'linear-gradient(135deg, #f8fff9 0%, #e8f5e8 100%)', boxShadow: '0 4px 12px rgba(40,167,69,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, color: '#28a745', fontSize: '18px', fontWeight: '600' }}>社員登録</h3>
            <button
              onClick={() => setShowEmployeeRegistration(false)}
              style={{
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#c82333'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#dc3545'}
            >
              ×
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: '500', color: '#495057', fontSize: '14px' }}>社員番号</label>
              <input
                value={newCode}
                onChange={e => setNewCode(e.target.value)}
                placeholder="例: 000"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: 8,
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#28a745'}
                onBlur={(e) => e.target.style.borderColor = '#ced4da'}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: '500', color: '#495057', fontSize: '14px' }}>氏名</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="例: ザット 太郎"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: 8,
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#28a745'}
                onBlur={(e) => e.target.style.borderColor = '#ced4da'}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: '500', color: '#495057', fontSize: '14px' }}>所属部署</label>
              <select
                value={newDepartment}
                onChange={e => setNewDepartment(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: 8,
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#28a745'}
                onBlur={(e) => e.target.style.borderColor = '#ced4da'}
              >
                <option value="">（未所属）</option>
                {deps.map(dep => (
                  <option key={dep.id} value={dep.name}>
                    {dep.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={onCreate}
              style={{
                padding: '12px 24px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontWeight: '500',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(40,167,69,0.3)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#218838'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#28a745'}
            >
              社員を登録
            </button>
          </div>

          {msg && (
            <div style={{
              marginTop: 16,
              padding: 12,
              background: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: 8,
              color: '#856404',
              fontSize: '14px'
            }}>
              {msg}
            </div>
          )}
        </div>
      )}

      {/* 社員情報変更メニュー */}
      {showEmployeeEditMenu && (
        <div style={{ marginBottom: 24, padding: 24, border: '1px solid #ffc107', borderRadius: 12, background: 'linear-gradient(135deg, #fffdf0 0%, #fff3cd 100%)', boxShadow: '0 4px 12px rgba(255,193,7,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, color: '#856404', fontSize: '18px', fontWeight: '600' }}>✏️ 社員情報変更</h3>
            <button
              onClick={() => setShowEmployeeEditMenu(false)}
              style={{
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#c82333'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#dc3545'}
            >
              ×
            </button>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: '500', color: '#495057', fontSize: '14px' }}>変更する社員を選択</label>
            <select
              value={editingEmployee?.code || ''}
              onChange={(e) => {
                const employee = data.find(emp => emp.code === e.target.value);
                if (employee) {
                  startEditEmployee(employee);
                }
              }}
              style={{
                width: '100%',
                maxWidth: '400px',
                padding: '10px 12px',
                border: '1px solid #ced4da',
                borderRadius: 6,
                fontSize: '14px',
                background: 'white'
              }}
            >
              <option value="">社員を選択してください</option>
              {data.map(emp => (
                <option key={emp.code} value={emp.code}>
                  {emp.code} - {emp.name} ({emp.dept || (emp as any).department_name || '未所属'})
                </option>
              ))}
            </select>
          </div>

          {editingEmployee && (
            <div style={{ padding: 20, border: '1px solid #e9ecef', borderRadius: 8, background: 'white' }}>
              <h4 style={{ marginTop: 0, marginBottom: 16, color: '#495057', fontSize: '16px', fontWeight: '600' }}>
                {editingEmployee.name} の情報を変更
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, alignItems: 'flex-end' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: '500', color: '#495057', fontSize: '14px' }}>社員番号</label>
                  <input
                    value={editEmployeeCode}
                    onChange={e => setEditEmployeeCode(e.target.value)}
                    placeholder="例: 001"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ced4da',
                      borderRadius: 6,
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: '500', color: '#495057', fontSize: '14px' }}>氏名</label>
                  <input
                    value={editEmployeeName}
                    onChange={e => setEditEmployeeName(e.target.value)}
                    placeholder="例: 田中太郎"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ced4da',
                      borderRadius: 6,
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: '500', color: '#495057', fontSize: '14px' }}>所属部署</label>
                  <select
                    value={editEmployeeDept}
                    onChange={e => setEditEmployeeDept(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ced4da',
                      borderRadius: 6,
                      fontSize: '14px',
                      background: 'white'
                    }}
                  >
                    <option value={0}>部署を選択</option>
                    {deps.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={saveEmployeeEdit}
                  disabled={loading}
                  style={{
                    padding: '10px 20px',
                    background: loading ? '#6c757d' : '#ffc107',
                    color: loading ? 'white' : '#212529',
                    border: 'none',
                    borderRadius: 6,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {loading ? '更新中...' : '✏️ 更新'}
                </button>
                <button
                  onClick={cancelEditEmployee}
                  style={{
                    padding: '10px 20px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}

          {msg && (
            <div style={{
              marginTop: 16,
              padding: 12,
              background: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: 8,
              color: '#856404',
              fontSize: '14px'
            }}>
              {msg}
            </div>
          )}
        </div>
      )}

      {/* 部署フィルターボタン群 */}
      <div style={{ marginBottom: 24, padding: 20, border: '1px solid #e9ecef', borderRadius: 12, background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontWeight: '600', color: '#495057', fontSize: '16px' }}>部署フィルター:</span>
          <button
            onClick={() => setDepFilter(null)}
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              border: '1px solid #ced4da',
              background: depFilter === null ? '#007bff' : '#fff',
              color: depFilter === null ? 'white' : '#495057',
              fontWeight: '500',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: depFilter === null ? '0 2px 4px rgba(0,123,255,0.3)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (depFilter !== null) {
                e.currentTarget.style.background = '#f8f9fa';
                e.currentTarget.style.borderColor = '#007bff';
              }
            }}
            onMouseLeave={(e) => {
              if (depFilter !== null) {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.borderColor = '#ced4da';
              }
            }}
          >
            すべて
          </button>
          {deps.map(d => (
            <button
              key={d.id}
              onClick={() => setDepFilter(d.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 20,
                border: '1px solid #ced4da',
                background: depFilter === d.id ? '#007bff' : '#fff',
                color: depFilter === d.id ? 'white' : '#495057',
                fontWeight: '500',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: depFilter === d.id ? '0 2px 4px rgba(0,123,255,0.3)' : 'none'
              }}
              title="所属ユーザーを表示"
              onMouseEnter={(e) => {
                if (depFilter !== d.id) {
                  e.currentTarget.style.background = '#f8f9fa';
                  e.currentTarget.style.borderColor = '#007bff';
                }
              }}
              onMouseLeave={(e) => {
                if (depFilter !== d.id) {
                  e.currentTarget.style.background = '#fff';
                  e.currentTarget.style.borderColor = '#ced4da';
                }
              }}
            >
              {d.name}
            </button>
          ))}
        </div>
      </div>

      {/* 日次表示：グループ化された社員一覧 */}
      <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', padding: 24 }}>
        <h3 style={{ marginTop: 0, marginBottom: 20, fontSize: '20px', fontWeight: '600', color: '#2c3e50' }}>社員一覧（クリックで詳細表示）</h3>

        {/* シンプルな社員一覧 */}
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {sorted?.map(r => (
              <div
                key={r.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 16px',
                  border: '1px solid #e9ecef',
                  borderRadius: '8px',
                  background: selectedEmployee?.code === r.code ? 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)' : 'white',
                  boxShadow: selectedEmployee?.code === r.code ? '0 4px 12px rgba(25,118,210,0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'all 0.2s ease',
                  borderColor: selectedEmployee?.code === r.code ? '#1976d2' : '#e9ecef'
                }}
              >
                <button
                  onClick={() => selectEmployee(r)}
                  title={`社員名: ${r.name}\n社員番号: ${r.code}\n部署: ${r.dept || (r as any).department_name || '未所属'}`}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: selectedEmployee?.code === r.code ? '#1976d2' : '#495057',
                    padding: 0,
                    flex: 1,
                    textAlign: 'left'
                  }}
                >
                  {r.name} ({r.code})
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditEmployee(r);
                  }}
                  title="社員情報を編集"
                  style={{
                    background: '#ffc107',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: '#212529',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e0a800';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffc107';
                  }}
                >
                  編集
                </button>
              </div>
            ))}
          </div>
          {!sorted?.length && (
            <div style={{ padding: 32, color: '#6c757d', textAlign: 'center', fontSize: '16px' }}>
              <div style={{ fontSize: '48px', marginBottom: 16 }}>📋</div>
              データがありません
            </div>
          )}
        </div>
      </div>

      {/* 月別勤怠記録セクション */}
      <div style={{ marginTop: 32, background: 'white', borderRadius: 16, boxShadow: '0 4px 6px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#374151' }}>
            📅 月別勤怠カレンダー ({date.slice(0, 7)})
          </h3>
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
              cursor: 'pointer',
            }}
          />
        </div>

        {/* カレンダーテーブル */}
        {selectedEmployee && (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px',
                background: 'white',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              }}
            >
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: 'white' }}>
                  <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, minWidth: '120px' }}>
                    日付
                  </th>
                  <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: 700, minWidth: '100px' }}>
                    出勤時間
                  </th>
                  <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: 700, minWidth: '100px' }}>
                    退勤時間
                  </th>
                  <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: 700, minWidth: '100px' }}>
                    勤務時間
                  </th>
                  <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: 700, minWidth: '100px' }}>
                    残業時間
                  </th>
                  <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: 700, minWidth: '100px' }}>
                    深夜時間
                  </th>
                  <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: 700, minWidth: '100px' }}>
                    法定内残業
                  </th>
                  <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: 700, minWidth: '100px' }}>
                    法定外残業
                  </th>
                  <th style={{ padding: '16px 8px', textAlign: 'center', fontWeight: 700, minWidth: '120px', maxWidth: '150px' }}>
                    備考
                  </th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const month = date.slice(0, 7); // YYYY-MM形式
                  const year = new Date(month + '-01').getFullYear();
                  const monthNum = new Date(month + '-01').getMonth();
                  const daysInMonth = new Date(year, monthNum + 1, 0).getDate();
                  const rows: JSX.Element[] = [];

                  for (let day = 1; day <= daysInMonth; day++) {
                    const dateStr = `${year}-${String(monthNum + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    // 選択された社員の該当日のデータを検索
                    const userData = employeeDetails.find(emp => emp.code === selectedEmployee.code && emp.date === dateStr);
                    const currentDate = new Date(year, monthNum, day);
                    const dayOfWeek = currentDate.getDay();
                    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

                    const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;
                    const isSundayDay = dayOfWeek === 0;
                    const holidayName = isHolidaySync(dateStr) ? getHolidayNameSync(dateStr) : null;

                    const backgroundStyle = holidayName || isSundayDay
                      ? { background: '#fef2f2' } // 祝日・日曜は薄い赤背景
                      : dayOfWeek === 6
                        ? { background: '#eff6ff' } // 土曜は薄い青背景
                        : {};

                    rows.push(
                      <tr key={day} style={{ borderBottom: '1px solid #f3f4f6', background: day % 2 === 0 ? '#ffffff' : '#fafbfc' }}>
                        <td style={{ padding: 8, fontSize: 13, borderRight: '1px solid #f3f4f6', fontWeight: 600, ...backgroundStyle }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <div>{day}日({dayNames[dayOfWeek]})</div>
                            {holidayName && (
                              <div style={{
                                fontSize: '10px',
                                color: '#dc2626',
                                fontWeight: 'bold',
                                marginTop: '2px'
                              }}>
                                {holidayName}
                              </div>
                            )}
                            {isWeekendDay && !holidayName && (
                              <div style={{
                                fontSize: '10px',
                                color: isSundayDay ? '#dc2626' : '#2563eb',
                                fontWeight: 'bold',
                                marginTop: '2px'
                              }}>
                                {isSundayDay ? '日曜日' : '土曜日'}
                              </div>
                            )}
                          </div>
                        </td>
                        <td
                          onClick={() => {
                            if (selectedEmployee && userData) {
                              setEditingTimeData({
                                employee: selectedEmployee,
                                date: dateStr,
                                clockIn: userData.clock_in || '',
                                clockOut: userData.clock_out || ''
                              });
                              setShowTimeEditModal(true);
                            } else {
                              setMsg('社員を選択してください');
                            }
                          }}
                          style={{
                            padding: '12px',
                            fontSize: '14px',
                            color: userData ? '#2563eb' : '#374151',
                            textAlign: 'center',
                            borderRight: '1px solid #f3f4f6',
                            cursor: selectedEmployee && userData ? 'pointer' : 'default',
                            backgroundColor: selectedEmployee && userData ? '#f8fafc' : 'transparent',
                            transition: 'all 0.2s ease'
                          }}
                          title={selectedEmployee && userData ? '出勤時間を修正' : ''}
                        >
                          {userData ? fmtHM(userData.clock_in) : '—'}
                        </td>
                        <td
                          onClick={() => {
                            if (selectedEmployee && userData) {
                              setEditingTimeData({
                                employee: selectedEmployee,
                                date: dateStr,
                                clockIn: userData.clock_in || '',
                                clockOut: userData.clock_out || ''
                              });
                              setShowTimeEditModal(true);
                            } else {
                              setMsg('社員を選択してください');
                            }
                          }}
                          style={{
                            padding: '12px',
                            fontSize: '14px',
                            color: userData ? '#2563eb' : '#374151',
                            textAlign: 'center',
                            borderRight: '1px solid #f3f4f6',
                            cursor: selectedEmployee && userData ? 'pointer' : 'default',
                            backgroundColor: selectedEmployee && userData ? '#f8fafc' : 'transparent',
                            transition: 'all 0.2s ease'
                          }}
                          title={selectedEmployee && userData ? '退勤時間を修正' : ''}
                        >
                          {userData ? fmtHM(userData.clock_out) : '—'}
                        </td>
                        <td
                          style={{
                            padding: '12px',
                            fontSize: '14px',
                            color: '#374151',
                            textAlign: 'center',
                            borderRight: '1px solid #f3f4f6',
                          }}
                        >
                          {userData ? calcWorkTime(userData.clock_in, userData.clock_out) : '—'}
                        </td>
                        <td
                          style={{
                            padding: '12px',
                            fontSize: '14px',
                            color: '#374151',
                            textAlign: 'center',
                            borderRight: '1px solid #f3f4f6',
                          }}
                        >
                          {userData ? calcOvertimeFromTimes(userData.clock_in, userData.clock_out) : '—'}
                        </td>
                        <td
                          style={{
                            padding: '12px',
                            fontSize: '14px',
                            color: '#374151',
                            textAlign: 'center',
                            borderRight: '1px solid #f3f4f6',
                          }}
                        >
                          {userData ? calcNightWorkTime(userData.clock_in, userData.clock_out) : '—'}
                        </td>
                        <td
                          style={{
                            padding: '12px',
                            fontSize: '14px',
                            color: '#374151',
                            textAlign: 'center',
                            borderRight: '1px solid #f3f4f6',
                          }}
                        >
                          {userData ? calcLegalOvertime(userData.clock_in, userData.clock_out) : '—'}
                        </td>
                        <td
                          style={{
                            padding: '12px',
                            fontSize: '14px',
                            color: '#374151',
                            textAlign: 'center',
                            borderRight: '1px solid #f3f4f6',
                          }}
                        >
                          {userData ? calcIllegalOvertimeFromTimes(userData.clock_in, userData.clock_out) : '—'}
                        </td>
                        <td
                          style={{
                            padding: '8px 6px',
                            fontSize: '14px',
                            color: '#374151',
                            textAlign: 'center',
                            width: '150px',
                            maxWidth: '150px',
                          }}
                        >
                          <input
                            type="text"
                            value={remarks[`${dateStr}-${selectedEmployee.code}`] || ''}
                            onChange={(e) => {
                              const key = `${dateStr}-${selectedEmployee.code}`;
                              setRemarks(prev => ({ ...prev, [key]: e.target.value }));
                            }}
                            onBlur={(e) => {
                              if (e.target.value !== (remarks[`${dateStr}-${selectedEmployee.code}`] || '')) {
                                onSaveRemark(dateStr, e.target.value);
                              }
                            }}
                            style={{
                              width: '100%',
                              maxWidth: '140px',
                              padding: '4px 6px',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              fontSize: '11px',
                              background: 'white',
                            }}
                            placeholder="備考"
                          />
                        </td>
                      </tr>
                    );
                  }

                  return rows;
                })()}
              </tbody>
            </table>
          </div>
        )}

        {/* 社員編集モーダル */}
        {editingEmployee && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              borderRadius: 12,
              padding: 32,
              minWidth: 400,
              maxWidth: 500,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}>
              <h3 style={{
                margin: '0 0 24px 0',
                fontSize: 20,
                fontWeight: 600,
                color: '#2c3e50',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                ✏️ 社員情報の編集
              </h3>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: '#495057' }}>
                  社員コード
                </label>
                <input
                  type="text"
                  value={editEmployeeCode}
                  onChange={(e) => setEditEmployeeCode(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: 6,
                    fontSize: 14,
                    boxSizing: 'border-box'
                  }}
                  placeholder="社員コードを入力"
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: '#495057' }}>
                  社員名
                </label>
                <input
                  type="text"
                  value={editEmployeeName}
                  onChange={(e) => setEditEmployeeName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: 6,
                    fontSize: 14,
                    boxSizing: 'border-box'
                  }}
                  placeholder="社員名を入力"
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: '#495057' }}>
                  部署
                </label>
                <select
                  value={editEmployeeDept}
                  onChange={(e) => setEditEmployeeDept(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: 6,
                    fontSize: 14,
                    boxSizing: 'border-box',
                    background: 'white'
                  }}
                >
                  <option value={0}>部署を選択してください</option>
                  {deps.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  onClick={cancelEditEmployee}
                  style={{
                    padding: '10px 20px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#545b62';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#6c757d';
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={saveEmployeeEdit}
                  disabled={loading}
                  style={{
                    padding: '10px 20px',
                    background: loading ? '#6c757d' : '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.background = '#0056b3';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.currentTarget.style.background = '#007bff';
                    }
                  }}
                >
                  {loading ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 社員削除メニュー */}
        {showEmployeeDeleteMenu && (
          <div style={{ marginBottom: 24, padding: 24, border: '2px solid #dc3545', borderRadius: 12, background: 'linear-gradient(135deg, #fff5f5 0%, #f8d7da 100%)', boxShadow: '0 4px 12px rgba(220,53,69,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: '#721c24', fontSize: '18px', fontWeight: '600' }}>🗑️ 社員削除</h3>
              <button
                onClick={() => setShowEmployeeDeleteMenu(false)}
                style={{
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#c82333'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#dc3545'}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: '500', color: '#495057', fontSize: '14px' }}>削除する社員を選択</label>
              <select
                value={deleteTargetEmployee?.code || ''}
                onChange={(e) => {
                  const employee = data.find(emp => emp.code === e.target.value);
                  setDeleteTargetEmployee(employee || null);
                }}
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  padding: '10px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: 6,
                  fontSize: '14px',
                  background: 'white'
                }}
              >
                <option value="">社員を選択してください</option>
                {data.map(emp => (
                  <option key={emp.code} value={emp.code}>
                    {emp.code} - {emp.name} ({emp.dept || (emp as any).department_name || '未所属'})
                  </option>
                ))}
              </select>
            </div>

            {deleteTargetEmployee && (
              <div style={{ marginBottom: 20, padding: 16, background: '#fff', border: '1px solid #dee2e6', borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#495057', fontSize: '16px' }}>削除対象の社員情報</h4>
                <p style={{ margin: '4px 0', fontSize: '14px', color: '#6c757d' }}>社員コード: <strong>{deleteTargetEmployee.code}</strong></p>
                <p style={{ margin: '4px 0', fontSize: '14px', color: '#6c757d' }}>氏名: <strong>{deleteTargetEmployee.name}</strong></p>
                <p style={{ margin: '4px 0', fontSize: '14px', color: '#6c757d' }}>所属: <strong>{deleteTargetEmployee.dept || '未所属'}</strong></p>
                <div style={{ marginTop: 12, padding: 12, background: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: 6 }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#856404', fontWeight: '500' }}>
                    ⚠️ 削除すると、この社員に関連する勤怠データも全て削除されます。この操作は取り消せません。
                  </p>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => {
                  setShowEmployeeDeleteMenu(false);
                  setDeleteTargetEmployee(null);
                }}
                style={{
                  padding: '10px 20px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
              >
                キャンセル
              </button>
              <button
                onClick={deleteEmployee}
                disabled={!deleteTargetEmployee || loading}
                style={{
                  padding: '10px 20px',
                  background: !deleteTargetEmployee || loading ? '#6c757d' : '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: !deleteTargetEmployee || loading ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
              >
                {loading ? '削除中...' : '🗑️ 削除実行'}
              </button>
            </div>
          </div>
        )}

        {/* バックアップ管理メニュー */}
        {showBackupManagement && (
          <div style={{ marginBottom: 24, padding: 24, border: '2px solid #17a2b8', borderRadius: 12, background: 'linear-gradient(135deg, #e6f7ff 0%, #b3e5fc 100%)', boxShadow: '0 4px 12px rgba(23,162,184,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: '#0c5460', fontSize: '18px', fontWeight: '600' }}>💾 バックアップ管理</h3>
              <button
                onClick={() => setShowBackupManagement(false)}
                style={{
                  background: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#138496'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#17a2b8'}
              >
                ×
              </button>
            </div>

            {/* 手動バックアップ作成ボタン */}
            <div style={{ marginBottom: 20, padding: 16, background: '#fff', border: '1px solid #bee5eb', borderRadius: 8 }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#0c5460', fontSize: '16px' }}>📸 手動バックアップ作成</h4>
              <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6c757d' }}>
                現在のデータの状態を手動でバックアップします。重要な作業前の保存にご利用ください。
              </p>
              <button
                onClick={createManualBackup}
                disabled={backupLoading}
                style={{
                  padding: '12px 24px',
                  background: backupLoading ? '#6c757d' : '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: backupLoading ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                {backupLoading ? '⏳ 作成中...' : '📸 バックアップ作成'}
              </button>
            </div>

            {/* バックアップ一覧 */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#0c5460', fontSize: '16px' }}>📋 バックアップ一覧</h4>
              {backupLoading ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#6c757d' }}>
                  ⏳ バックアップ一覧を読み込み中...
                </div>
              ) : backups.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#6c757d', background: '#f8f9fa', borderRadius: 8 }}>
                  バックアップがありません
                </div>
              ) : (
                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #bee5eb', borderRadius: 8 }}>
                  {backups.map((backup, index) => (
                    <div key={backup.name} style={{
                      padding: '12px 16px',
                      borderBottom: index < backups.length - 1 ? '1px solid #e9ecef' : 'none',
                      background: index % 2 === 0 ? '#fff' : '#f8f9fa',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500', color: '#495057', fontSize: '14px' }}>
                          {backup.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6c757d', marginTop: 2 }}>
                          📅 {new Date(backup.date).toLocaleString('ja-JP')} |
                          💾 {backup.size}KB
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => restoreBackup(backup.name)}
                          disabled={backupLoading}
                          style={{
                            padding: '6px 12px',
                            background: backupLoading ? '#6c757d' : '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: backupLoading ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          🔄 復元
                        </button>
                        <button
                          onClick={() => deleteBackup(backup.name)}
                          disabled={backupLoading}
                          style={{
                            padding: '6px 12px',
                            background: backupLoading ? '#6c757d' : '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: backupLoading ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          🗑️ 削除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* リアルタイム更新ボタン */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => {
                  loadBackups();
                  loadOnce(loadKey);
                }}
                disabled={backupLoading}
                style={{
                  padding: '10px 20px',
                  background: backupLoading ? '#6c757d' : '#6f42c1',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: backupLoading ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                🔄 リアルタイム更新
              </button>
            </div>
          </div>
        )}

        {/* 月別集計（1列表示） - ユーザー選択時のみ表示 */}
        {selectedEmployee && (
          <div style={{
            marginTop: 32,
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderRadius: 12,
            border: '2px solid #495057',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
          }}>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 700,
                color: '#495057',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}>
                <span style={{ fontSize: 24 }}>📊</span>
                {selectedEmployee.name} の月別勤怠集計 ({date.slice(0, 7)})
              </h3>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16,
              padding: '16px 20px',
              background: 'white',
              borderRadius: 8,
              border: '1px solid #e5e7eb'
            }}>
              {/* 集計計算 - 選択された社員のデータのみ */}
              <div style={{ fontSize: 14, color: '#495057', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#28a745', fontWeight: 600 }}>勤務時間:</span>
                <strong style={{ color: '#28a745', fontSize: 16 }}>
                  {(() => {
                    const totalMinutes = employeeDetails.reduce((sum, r) => {
                      if (r.clock_in && r.clock_out) {
                        const workTime = calcWorkTime(r.clock_in, r.clock_out);
                        if (workTime !== '—') {
                          const [hours, minutes] = workTime.split(':').map(Number);
                          return sum + (hours * 60) + minutes;
                        }
                      }
                      return sum;
                    }, 0);
                    const hours = Math.floor(totalMinutes / 60);
                    const minutes = totalMinutes % 60;
                    return `${hours}:${String(minutes).padStart(2, '0')}`;
                  })()}
                </strong>
              </div>
              <div style={{ fontSize: 14, color: '#495057', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#ffc107', fontWeight: 600 }}>遅刻・早退:</span>
                <strong style={{ color: '#ffc107', fontSize: 16 }}>
                  {(() => {
                    const totalMinutes = employeeDetails.reduce((sum, r) => sum + (r.late || 0) + (r.early || 0), 0);
                    const hours = Math.floor(totalMinutes / 60);
                    const minutes = totalMinutes % 60;
                    return `${hours}:${String(minutes).padStart(2, '0')}`;
                  })()}
                </strong>
              </div>
              <div style={{ fontSize: 14, color: '#495057', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#6f42c1', fontWeight: 600 }}>残業:</span>
                <strong style={{ color: '#6f42c1', fontSize: 16 }}>
                  {(() => {
                    const totalMinutes = employeeDetails.reduce((sum, r) => {
                      if (r.clock_in && r.clock_out) {
                        const overtime = calcOvertimeFromTimes(r.clock_in, r.clock_out);
                        if (overtime !== '0:00') {
                          const [hours, minutes] = overtime.split(':').map(Number);
                          return sum + (hours * 60) + minutes;
                        }
                      }
                      return sum;
                    }, 0);
                    const hours = Math.floor(totalMinutes / 60);
                    const minutes = totalMinutes % 60;
                    return `${hours}:${String(minutes).padStart(2, '0')}`;
                  })()}
                </strong>
              </div>
              <div style={{ fontSize: 14, color: '#495057', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#6c757d', fontWeight: 600 }}>深夜勤務:</span>
                <strong style={{ color: '#6c757d', fontSize: 16 }}>
                  {(() => {
                    const totalMinutes = employeeDetails.reduce((sum, r) => {
                      if (r.clock_in && r.clock_out) {
                        const nightTime = calcNightWorkTime(r.clock_in, r.clock_out);
                        if (nightTime !== '0:00') {
                          const [hours, minutes] = nightTime.split(':').map(Number);
                          return sum + (hours * 60) + minutes;
                        }
                      }
                      return sum;
                    }, 0);
                    const hours = Math.floor(totalMinutes / 60);
                    const minutes = totalMinutes % 60;
                    return `${hours}:${String(minutes).padStart(2, '0')}`;
                  })()}
                </strong>
              </div>
              <div style={{ fontSize: 14, color: '#495057', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#0ea5e9', fontWeight: 600 }}>法定内時間外:</span>
                <strong style={{ color: '#0ea5e9', fontSize: 16 }}>
                  {(() => {
                    const totalMinutes = employeeDetails.reduce((sum, r) => {
                      if (r.clock_in && r.clock_out) {
                        const legalOvertime = calcLegalOvertime(r.clock_in, r.clock_out);
                        if (legalOvertime !== '0:00') {
                          const [hours, minutes] = legalOvertime.split(':').map(Number);
                          return sum + (hours * 60) + minutes;
                        }
                      }
                      return sum;
                    }, 0);
                    const hours = Math.floor(totalMinutes / 60);
                    const minutes = totalMinutes % 60;
                    return `${hours}:${String(minutes).padStart(2, '0')}`;
                  })()}
                </strong>
              </div>
              <div style={{ fontSize: 14, color: '#495057', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#ef4444', fontWeight: 600 }}>法定外時間外:</span>
                <strong style={{ color: '#ef4444', fontSize: 16 }}>
                  {(() => {
                    const totalMinutes = employeeDetails.reduce((sum, r) => {
                      if (r.clock_in && r.clock_out) {
                        const illegalOvertime = calcIllegalOvertimeFromTimes(r.clock_in, r.clock_out);
                        if (illegalOvertime !== '0:00') {
                          const [hours, minutes] = illegalOvertime.split(':').map(Number);
                          return sum + (hours * 60) + minutes;
                        }
                      }
                      return sum;
                    }, 0);
                    const hours = Math.floor(totalMinutes / 60);
                    const minutes = totalMinutes % 60;
                    return `${hours}:${String(minutes).padStart(2, '0')}`;
                  })()}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* 勤怠時間修正モーダル */}
        {showTimeEditModal && editingTimeData && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              minWidth: '400px',
              maxWidth: '500px'
            }}>
              <h3 style={{ marginBottom: '20px', color: '#333', textAlign: 'center' }}>
                📅 勤怠時間修正
              </h3>

              <div style={{
                marginBottom: '20px',
                padding: '12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong style={{ color: '#495057' }}>社員名:</strong>
                  <span style={{ marginLeft: '8px', color: '#2563eb', fontWeight: '600' }}>
                    {editingTimeData.employee.name}
                  </span>
                </div>
                <div>
                  <strong style={{ color: '#495057' }}>対象日:</strong>
                  <span style={{ marginLeft: '8px', color: '#dc3545', fontWeight: '600' }}>
                    {new Date(editingTimeData.date).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short'
                    })}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                  出勤時間:
                </label>
                <input
                  type="time"
                  value={editingTimeData.clockIn ? new Date(editingTimeData.clockIn).toTimeString().slice(0, 5) : ''}
                  onChange={(e) => {
                    if (editingTimeData && e.target.value) {
                      const [hours, minutes] = e.target.value.split(':');
                      const date = new Date(editingTimeData.date);
                      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                      setEditingTimeData({
                        ...editingTimeData,
                        clockIn: date.toISOString()
                      });
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                  退勤時間:
                </label>
                <input
                  type="time"
                  value={editingTimeData.clockOut ? new Date(editingTimeData.clockOut).toTimeString().slice(0, 5) : ''}
                  onChange={(e) => {
                    if (editingTimeData && e.target.value) {
                      const [hours, minutes] = e.target.value.split(':');
                      const date = new Date(editingTimeData.date);
                      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                      setEditingTimeData({
                        ...editingTimeData,
                        clockOut: date.toISOString()
                      });
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={cancelTimeEdit}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={saveTimeEdit}
                  disabled={loading}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: loading ? '#6c757d' : '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {loading ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 社員編集モーダル */}
        {showEmployeeEditModal && editingEmployee && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              width: '90%',
              maxWidth: '500px',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '25px', fontSize: '20px', fontWeight: '600', color: '#2c3e50' }}>
                社員情報編集
              </h3>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                  社員番号:
                </label>
                <input
                  type="text"
                  value={editEmployeeCode}
                  onChange={(e) => setEditEmployeeCode(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '6px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="社員番号を入力"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                  社員名:
                </label>
                <input
                  type="text"
                  value={editEmployeeName}
                  onChange={(e) => setEditEmployeeName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '6px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="社員名を入力"
                />
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                  部署:
                </label>
                <select
                  value={editEmployeeDept}
                  onChange={(e) => setEditEmployeeDept(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '6px',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                    backgroundColor: 'white'
                  }}
                >
                  <option value={0}>未所属</option>
                  {deps.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={cancelEditEmployee}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#5a6268';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#6c757d';
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={saveEmployeeEdit}
                  disabled={loading}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: loading ? '#6c757d' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.backgroundColor = '#218838';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.currentTarget.style.backgroundColor = '#28a745';
                    }
                  }}
                >
                  {loading ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '8px 6px', fontWeight: 600 };
const td: React.CSSProperties = { padding: '6px' };

// 状況に応じて薄い色分け
function rowBg(r: MasterRow) {
  if (r.status === '出勤中') return '#f0fff4'; // 薄緑
  if ((r.late || 0) + (r.early || 0) + (r.overtime || 0) + (r.night || 0) > 0) return '#fffdf0'; // 薄黄
  return 'transparent';
}
