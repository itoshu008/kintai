const BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_ATTENDANCE_API_BASE) ||
  (typeof window !== "undefined" && window.location.hostname === "zatint1991.com" ? "/api/admin" : "http://127.0.0.1:8000/api/admin");

import { request } from "./request";

export const api = {
  health: async () => request(`${BASE}/health`),
  clockIn: async (code: string, note?: string) =>
    request(`${BASE}/public/clock-in`, {
      method: 'POST',
      body: JSON.stringify({ code, note })
    }),
  clockOut: async (code: string) =>
    request(`${BASE}/public/clock-out`, {
      method: 'POST',
      body: JSON.stringify({ code })
    }),
  master: async (date?: string, sort?: 'late'|'early'|'overtime'|'night') => {
    const q = new URLSearchParams(); if (date) q.set('date', date); if (sort) q.set('sort', sort);
    return request(`${BASE}/master?${q}`);
  },
  weekly: async (start?: string) => {
    const q = new URLSearchParams(); if (start) q.set('start', start);
    return request(`${BASE}/weekly?${q}`);
  },
  // 部署管理
  listDepartments: async () => request(`${BASE}/departments`),
  createDepartment: async (name: string) =>
    request(`${BASE}/departments`, {
      method: 'POST',
      body: JSON.stringify({ name })
    }),
  updateDepartment: async (id: number, name: string) =>
    request(`${BASE}/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name })
    }),
  // 社員管理
  listEmployees: async () => request(`${BASE}/employees`),
  createEmployee: async (code: string, name: string, department_id?: number) =>
    request(`${BASE}/employees`, {
      method: 'POST',
      body: JSON.stringify({ code, name, department_id })
    }),
  updateEmployee: async (id: number, code: string, name: string, department_id?: number) =>
    request(`${BASE}/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ code, name, department_id })
    }),
  deleteEmployee: async (id: number) =>
    request(`${BASE}/employees/${id}`, {
      method: 'DELETE'
    }),
  // 勤怠管理
  clock: async (code: string, action: 'in' | 'out') =>
    request(`${BASE}/clock`, {
      method: 'POST',
      body: JSON.stringify({ code, action })
    }),
};