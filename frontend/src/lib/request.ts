// src/lib/request.ts
import { extractErrorMessageFromHtml, handleApiError } from '../utils/errorHandler';

export async function request(input: string, init?: RequestInit) {
  try {
    console.log(`[API REQUEST] ${init?.method || 'GET'} ${input}`);
    
    const res = await fetch(input, {
      credentials: "include", // セッション管理のために有効化
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      ...init,
    });

    console.log(`[API RESPONSE] ${res.status} ${res.statusText} for ${input}`);

    // ステータスコードをチェック
    if (!res.ok) {
      console.error(`[API HTTP ERROR] ${res.status} ${res.statusText} for ${input}`);
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    // Content-TypeをチェックしてJSONレスポンスを検証
    const contentType = res.headers.get('content-type');
    console.log(`[API CONTENT TYPE] ${contentType} for ${input}`);
    
    if (!contentType || !contentType.includes('application/json')) {
      const errorText = await res.text();
      console.error('[API CONTENT TYPE ERROR]', {
        url: input,
        status: res.status,
        contentType,
        responseText: errorText.slice(0, 200)
      });
      
      // HTMLレスポンスからエラーメッセージを抽出
      const extractedError = extractErrorMessageFromHtml(errorText);
      throw new Error(`Invalid API response: ${extractedError}`);
    }

    const text = await res.text();
    
    // 空のレスポンスの場合はnullを返す
    if (!text.trim()) {
      return null;
    }
    
    // レスポンスを先にパースしてからエラーチェック
    let jsonResponse;
    try {
      jsonResponse = JSON.parse(text);
    } catch (parseError) {
      console.error('[API PARSE ERROR]', {
        url: input,
        status: res.status,
        contentType,
        responseText: text.slice(0, 200),
        parseError
      });
      throw new Error(`Invalid JSON response from ${input}: ${text.slice(0, 100)}...`);
    }

    // okフィールドでエラーを判定（すべて200を返すため）
    if (jsonResponse && jsonResponse.ok === false) {
      console.error("[API ERROR]", {
        url: input, 
        status: res.status, 
        statusText: res.statusText,
        body: init?.body, 
        responseText: text, 
        error: jsonResponse.error
      });
      throw new Error(jsonResponse.error || `API Error: ${res.status} ${res.statusText || ''} for ${input}`);
    }
    
    return jsonResponse;
  } catch (error) {
    const errorResponse = handleApiError(error, `request to ${input}`);
    console.error('[REQUEST ERROR]', {
      url: input,
      method: init?.method || 'GET',
      error: errorResponse.error,
      message: errorResponse.message
    });
    throw error;
  }
}

// 汎用的なデータ取得関数（Content-Typeチェック付き）
export const fetchData = async (url: string, options?: RequestInit) => {
  try {
    const response = await fetch(url, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
      ...options,
    });

    const contentType = response.headers.get('content-type');

    // レスポンスがJSONでない場合はエラーを投げる
    if (!contentType || !contentType.includes('application/json')) {
      const errorText = await response.text();
      console.error('API returned HTML instead of JSON:', {
        url,
        status: response.status,
        contentType,
        responseText: errorText.slice(0, 200)
      });
      
      // HTMLレスポンスからエラーメッセージを抽出
      const extractedError = extractErrorMessageFromHtml(errorText);
      throw new Error(`Invalid API response: ${extractedError}`);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    // エラーを処理する
    const errorResponse = handleApiError(error, `fetchData from ${url}`);
    console.error('Failed to fetch data:', {
      url,
      error: errorResponse.error,
      message: errorResponse.message
    });
    // 必要に応じてUIにエラーメッセージを表示
    return { error: errorResponse.error || 'Failed to load data' };
  }
};

// エラーハンドリング機能をエクスポート
export { 
  handleError, 
  fetchDataWithRetry, 
  fetchHtmlError, 
  extractErrorMessageFromHtml,
  handleApiError 
} from '../utils/errorHandler';
