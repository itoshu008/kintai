// 新規ファイル
declare global { interface Window { isPreview?: boolean } }
export const IS_PREVIEW =
  (typeof window !== 'undefined' && window.isPreview === true) ||
  (typeof import.meta !== 'undefined' &&
   typeof (import.meta as any).env !== 'undefined' &&
   (import.meta as any).env.VITE_IS_PREVIEW === 'true');
