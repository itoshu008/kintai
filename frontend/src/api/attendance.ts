// src/api/attendance.ts
import { request } from "../lib/request";
import { 
  MasterRow, 
  Department, 
  Employee, 
  ApiResponse, 
  ClockResponse, 
  HealthResponse 
} from "../types/attendance.js";

const BASE = "/api";

// モック機能を完全に無効化
const USE_MOCK = false;
const mock = null as any;

// 開発環境でのみデバッグログを表示
if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
  console.log('🔧 API設定:', { 
    BASE, 
    USE_MOCK, 
    hasMock: !!mock, 
    env: (import.meta as any).env?.VITE_USE_MOCK,
    NODE_ENV: process.env.NODE_ENV 
  });
}

export const api = {
  // ヘルスチェック
  health: async (): Promise<HealthResponse> => {
    if (USE_MOCK && mock) return mock.health();
    return request(`${BASE}/health`);
  },

  // マスターデータ取得
  master: async (
    date?: string, 
    sort?: 'late' | 'early' | 'overtime' | 'night', 
    department?: number
  ): Promise<ApiResponse<MasterRow>> => {
    if (USE_MOCK && mock) return mock.master(date);
    const q = new URLSearchParams(); 
    if (date) q.set('date', date); 
    if (sort) q.set('sort', sort);
    if (department) q.set('department', String(department));
    const url = `${BASE}/admin/master?${q}`;
    
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.log('API呼び出し: master', { date, sort, department, url });
    }
    return request(url);
  },
  weekly: async (start?: string) => {
    const q = new URLSearchParams(); if (start) q.set('start', start);
    return request(`${BASE}/admin/weekly?${q}`);
  },
  // 出勤打刻
  clockIn: async (code: string, note?: string): Promise<ClockResponse> => {
    if (USE_MOCK && mock) {
      return mock.clockIn(code, note);
    }
    return request(`${BASE}/attendance/checkin`, {
      method: 'POST',
      body: JSON.stringify({ code, note })
    });
  },

  // 退勤打刻
  clockOut: async (code: string): Promise<ClockResponse> => {
    if (USE_MOCK && mock) {
      return mock.clockOut(code);
    }
    return request(`${BASE}/attendance/checkout`, {
      method: 'POST',
      body: JSON.stringify({ code })
    });
  },

  // 社員一覧・登録・更新
  listEmployees: async () => {
    if (USE_MOCK && mock) return mock.employees();
    return request(`${BASE}/admin/employees`);
  },
  
  createEmployee: async (code: string, name: string, department_id?: number) => {
    if (USE_MOCK && mock) return mock.createEmployee(code, name, department_id);
    return request(`${BASE}/admin/employees`, {
      method: 'POST',
      body: JSON.stringify({ code, name, department_id })
    });
  },
  
  updateEmployee: async (originalCode: string, data: {code: string, name: string, department_id: number}) => {
    if (USE_MOCK && mock) return mock.updateEmployee(originalCode, data);
    console.log('API呼び出し: updateEmployee', { originalCode, data, url: `${BASE}/admin/employees/${originalCode}` });
    return request(`${BASE}/admin/employees/${originalCode}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  
  deleteEmployee: async (id: number) => {
    if (USE_MOCK && mock) return mock.deleteEmployee(id);
    console.log('API呼び出し: deleteEmployee', { id, url: `${BASE}/admin/employees/${id}` });
    return request(`${BASE}/admin/employees/${id}`, {
      method: 'DELETE'
    });
  },
  
  // 部署管理
  listDepartments: async () => {
    if (USE_MOCK && mock) return mock.departments();
    console.log('API呼び出し: listDepartments', { url: `${BASE}/admin/departments` });
    return request(`${BASE}/admin/departments`);
  },
  
  createDepartment: async (name: string) => {
    if (USE_MOCK && mock) return mock.createDepartment(name);
    return request(`${BASE}/admin/departments`, {
      method: 'POST',
      body: JSON.stringify({name})
    });
  },
  
  updateDepartment: async (id: number, name: string) => {
    if (USE_MOCK && mock) return mock.updateDepartment(id, name);
    return request(`${BASE}/admin/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({name})
    });
  },
  
  deleteDepartment: async (id: number) => {
    if (USE_MOCK && mock) return mock.deleteDepartment(id);
    return request(`${BASE}/admin/departments/${id}`, {
      method: 'DELETE'
    });
  },
  
  // 備考関連API
  saveRemark: async (employeeCode: string, date: string, remark: string) =>
    request(`${BASE}/admin/remarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeCode, date, remark })
    }),

  getRemark: async (employeeCode: string, date: string) =>
    request(`${BASE}/admin/remarks/${employeeCode}/${date}`),

  getRemarks: async (employeeCode: string, month?: string) => {
    const query = month ? `?month=${month}` : '';
    return request(`${BASE}/admin/remarks/${employeeCode}${query}`);
  },

  // 祝日関連API
  getHolidays: async () => {
    if (USE_MOCK && mock) return mock.getHolidays();
    return request(`${BASE}/admin/holidays`);
  },

  checkHoliday: async (date: string) => {
    if (USE_MOCK && mock) return mock.checkHoliday(date);
    return request(`${BASE}/admin/holidays/${date}`);
  },

  // セッション管理
  saveSession: async (userData: { code: string; name: string; department: string; rememberMe?: boolean }) => {
    console.log('API呼び出し: saveSession', userData);
    return request(`${BASE}/admin/sessions`, {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  getSession: async (sessionId: string) => {
    console.log('API呼び出し: getSession', { sessionId });
    return request(`${BASE}/admin/sessions/${sessionId}`);
  },

  deleteSession: async (sessionId: string) => {
    console.log('API呼び出し: deleteSession', { sessionId });
    return request(`${BASE}/admin/sessions/${sessionId}`, {
      method: 'DELETE'
    });
  }
};
