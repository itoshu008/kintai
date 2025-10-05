// src/lib/request.ts
export async function request(input: string, init?: RequestInit) {
  const res = await fetch(input, {
    // credentials: "include", // 一時的に無効化してCORSエラーを回避
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });

  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) {}

  if (!res.ok) {
    // ここで詳細ログを出して原因特定を楽に
    console.error("[API ERROR]", {
      url: input, status: res.status, statusText: res.statusText,
      body: init?.body, responseText: text
    });
    throw new Error(`[${res.status}] ${input} → ${res.statusText}`);
  }
  return data;
}
