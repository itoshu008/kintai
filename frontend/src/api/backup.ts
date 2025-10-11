import { request } from '../lib/request';

export interface BackupInfo {
  id: string;
  timestamp: string;
  size: number;
}

export interface BackupData {
  id: string;
  timestamp: string;
  employees: any[];
  departments: any[];
  attendance: Record<string, any>;
  holidays: Record<string, string>;
  remarks: Record<string, string>;
}

export const backupApi = {
  // バックアップ作成
  createBackup: async (): Promise<{ ok: boolean; backupId: string; timestamp: string; message: string }> => {
    const response = await request('/api/admin/backup', {
      method: 'POST',
    });
    return response;
  },

  // バックアップ一覧取得
  getBackups: async (): Promise<{ ok: boolean; backups: BackupInfo[] }> => {
    const response = await request('/api/admin/backups', {
      method: 'GET',
    });
    return response;
  },

  // バックアップ詳細取得
  getBackupDetail: async (backupId: string): Promise<{ ok: boolean; backup: BackupData }> => {
    const response = await request(`/api/admin/backups/${backupId}`, {
      method: 'GET',
    });
    return response;
  },

  // バックアップから復元
  restoreBackup: async (backupId: string): Promise<{ ok: boolean; message: string; restoredAt: string }> => {
    const response = await request(`/api/admin/backups/${backupId}/restore`, {
      method: 'POST',
    });
    return response;
  },

  // バックアップ削除
  deleteBackup: async (backupId: string): Promise<{ ok: boolean; message: string }> => {
    const response = await request(`/api/admin/backups/${backupId}`, {
      method: 'DELETE',
    });
    return response;
  },
};
