// src/lib/request.ts
export async function request(input: string, init?: RequestInit) {
  const res = await fetch(input, {
    // credentials: "include", // 一時的に無効化してCORSエラーを回避
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });

  const text = await res.text();
  
  if (!res.ok) {
    console.error("[API ERROR]", {
      url: input, status: res.status, statusText: res.statusText,
      body: init?.body, responseText: text
    });
    throw new Error(`${res.status} ${res.statusText || ''} for ${input}`);
  }
  
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    console.error('[API PARSE ERROR]', text.slice(0, 200));
    throw new Error(`Invalid JSON from ${input}`);
  }
}
