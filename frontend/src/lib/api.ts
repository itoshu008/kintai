const BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_ATTENDANCE_API_BASE) ||
  "http://127.0.0.1:8000/api/admin";

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
};