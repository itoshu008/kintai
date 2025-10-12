// src/api/attendance.ts
import { MasterRow, Department, Employee, ApiResponse, ClockResponse, HealthResponse, AttendanceRecord } from '../types/attendance';

// APIのベースURL（8001番ポートで統一）
const API_BASE_URL = '/api';

// ヘルスチェックAPI
export const healthCheck = async (): Promise<HealthResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/health`);
    if (!response.ok) {
      throw new Error('Failed to check health');
    }
    const data: HealthResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking health:', error);
    return { ok: false, ts: '' };
  }
};

// 部署一覧取得
export const fetchDepartments = async (): Promise<ApiResponse<Department[]>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/departments`);
    if (!response.ok) {
      throw new Error('Failed to fetch departments');
    }
    const data: ApiResponse<Department[]> = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching departments:', error);
    return { ok: false, error: (error as Error).message };
  }
};

// 部署作成
export const createDepartment = async (name: string): Promise<ApiResponse<Department>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/departments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      throw new Error('Failed to create department');
    }
    const data: ApiResponse<Department> = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating department:', error);
    return { ok: false, error: (error as Error).message };
  }
};

// 部署更新
export const updateDepartment = async (id: number, name: string): Promise<ApiResponse<Department>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/departments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      throw new Error('Failed to update department');
    }
    const data: ApiResponse<Department> = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating department:', error);
    return { ok: false, error: (error as Error).message };
  }
};

// 部署削除
export const deleteDepartment = async (id: number): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/departments/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete department');
    }
    const data: ApiResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error deleting department:', error);
    return { ok: false, error: (error as Error).message };
  }
};

// 社員一覧取得
export const fetchEmployees = async (): Promise<ApiResponse<Employee[]>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/employees`);
    if (!response.ok) {
      throw new Error('Failed to fetch employees');
    }
    const data: ApiResponse<Employee[]> = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching employees:', error);
    return { ok: false, error: (error as Error).message };
  }
};

// 特定の社員情報取得
export const fetchEmployee = async (employeeId: number): Promise<ApiResponse<Employee>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/employees/${employeeId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch employee');
    }
    const data: ApiResponse<Employee> = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching employee:', error);
    return { ok: false, error: (error as Error).message };
  }
};

// 社員作成
export const createEmployee = async (code: string, name: string, department_id?: number): Promise<ApiResponse<Employee>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, name, department_id }),
    });
    if (!response.ok) {
      throw new Error('Failed to create employee');
    }
    const data: ApiResponse<Employee> = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating employee:', error);
    return { ok: false, error: (error as Error).message };
  }
};

// 社員更新
export const updateEmployee = async (originalCode: string, data: {code: string, name: string, department_id: number}): Promise<ApiResponse<Employee>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/employees/${originalCode}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update employee');
    }
    const result: ApiResponse<Employee> = await response.json();
    return result;
  } catch (error) {
    console.error('Error updating employee:', error);
    return { ok: false, error: (error as Error).message };
  }
};

// 社員削除
export const deleteEmployee = async (id: number): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/employees/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete employee');
    }
    const data: ApiResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error deleting employee:', error);
    return { ok: false, error: (error as Error).message };
  }
};

// マスターデータ取得
export const fetchMasterData = async (date?: string, sort?: 'late' | 'early' | 'overtime' | 'night', department?: number): Promise<ApiResponse<MasterRow[]>> => {
  try {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (sort) params.set('sort', sort);
    if (department) params.set('department', String(department));
    
    const response = await fetch(`${API_BASE_URL}/admin/master?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch master data');
    }
    const data: ApiResponse<MasterRow[]> = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching master data:', error);
    return { ok: false, error: (error as Error).message };
  }
};

// 出勤打刻
export const clockIn = async (code: string, note?: string): Promise<ClockResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/attendance/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, note }),
    });
    if (!response.ok) {
      throw new Error('Failed to clock in');
    }
    const data: ClockResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error clocking in:', error);
    return { ok: false, message: (error as Error).message };
  }
};

// 退勤打刻
export const clockOut = async (code: string): Promise<ClockResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/attendance/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (!response.ok) {
      throw new Error('Failed to clock out');
    }
    const data: ClockResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error clocking out:', error);
    return { ok: false, message: (error as Error).message };
  }
};

// 勤怠記録保存
export const saveAttendanceRecord = async (attendance: AttendanceRecord): Promise<ApiResponse<AttendanceRecord>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/attendance/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attendance),
    });
    if (!response.ok) {
      throw new Error('Failed to save attendance record');
    }
    const data: ApiResponse<AttendanceRecord> = await response.json();
    return data;
  } catch (error) {
    console.error('Error saving attendance record:', error);
    return { ok: false, error: (error as Error).message };
  }
};

// 備考保存
export const saveRemark = async (employeeCode: string, date: string, remark: string): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/remarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeCode, date, remark }),
    });
    if (!response.ok) {
      throw new Error('Failed to save remark');
    }
    const data: ApiResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error saving remark:', error);
    return { ok: false, error: (error as Error).message };
  }
};

// 備考取得
export const getRemark = async (employeeCode: string, date: string): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/remarks/${employeeCode}/${date}`);
    if (!response.ok) {
      throw new Error('Failed to get remark');
    }
    const data: ApiResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting remark:', error);
    return { ok: false, error: (error as Error).message };
  }
};

// 祝日一覧取得
export const fetchHolidays = async (): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/holidays`);
    if (!response.ok) {
      throw new Error('Failed to fetch holidays');
    }
    const data: ApiResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return { ok: false, error: (error as Error).message };
  }
};

// 祝日チェック
export const checkHoliday = async (date: string): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/holidays/${date}`);
    if (!response.ok) {
      throw new Error('Failed to check holiday');
    }
    const data: ApiResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking holiday:', error);
    return { ok: false, error: (error as Error).message };
  }
};

// セッション保存
export const saveSession = async (userData: { code: string; name: string; department: string; rememberMe?: boolean }): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!response.ok) {
      throw new Error('Failed to save session');
    }
    const data: ApiResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error saving session:', error);
    return { ok: false, error: (error as Error).message };
  }
};

// セッション取得
export const getSession = async (sessionId: string): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/sessions/${sessionId}`);
    if (!response.ok) {
      throw new Error('Failed to get session');
    }
    const data: ApiResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting session:', error);
    return { ok: false, error: (error as Error).message };
  }
};

// セッション削除
export const deleteSession = async (sessionId: string): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/sessions/${sessionId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete session');
    }
    const data: ApiResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error deleting session:', error);
    return { ok: false, error: (error as Error).message };
  }
};

// 追加のAPI関数
export const master = fetchMasterData;
export const listDepartments = fetchDepartments;
export const getRemarks = async (employeeCode: string, month: string): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/remarks/${employeeCode}?month=${month}`);
    if (!response.ok) {
      throw new Error('Failed to get remarks');
    }
    const data: ApiResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting remarks:', error);
    return { ok: false, error: (error as Error).message };
  }
};

// APIオブジェクト（AuthContextで使用）
export const api = {
  saveSession,
  getSession,
  deleteSession,
  healthCheck,
  fetchDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  fetchEmployees,
  fetchEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  fetchMasterData,
  master,
  listDepartments,
  clockIn,
  clockOut,
  saveAttendanceRecord,
  saveRemark,
  getRemark,
  getRemarks,
  fetchHolidays,
  checkHoliday
};