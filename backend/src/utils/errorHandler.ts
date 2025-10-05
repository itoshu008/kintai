// src/utils/errorHandler.ts
import { Response } from 'express';

export interface ErrorResponse {
  error: {
    code: number;
    message: string;
    timestamp: string;
  };
}

export const createErrorResponse = (status: number, message: string): ErrorResponse => ({
  error: {
    code: status,
    message,
    timestamp: new Date().toISOString()
  }
});

export const sendError = (res: Response, status: number, message: string) => {
  const errorResponse = createErrorResponse(status, message);
  res.status(status).json(errorResponse);
};

export const handleDatabaseError = (res: Response, error: any, operation: string) => {
  console.error(`[DB] ${operation} error:`, error);
  
  // 特定のエラーコードに基づいた処理
  if (error.code === 'ER_DUP_ENTRY') {
    sendError(res, 409, '既に登録されているデータです');
  } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    sendError(res, 400, '参照先のデータが見つかりません');
  } else if (error.code === 'ECONNREFUSED') {
    sendError(res, 503, 'データベースに接続できません');
  } else {
    sendError(res, 500, `${operation}に失敗しました`);
  }
};

export const validateRequired = (fields: Record<string, any>): string | null => {
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
      return `${key}は必須項目です`;
    }
  }
  return null;
};

export const validateId = (id: string): number | null => {
  const numId = Number(id);
  if (isNaN(numId) || numId <= 0) {
    return null;
  }
  return numId;
};
