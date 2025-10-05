// src/config/database.ts
import mysql from 'mysql2/promise';
import { logger } from '../utils/logger';

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  timezone: string;
  waitForConnections: boolean;
  connectionLimit: number;
  acquireTimeout: number;
  timeout: number;
  reconnect: boolean;
  ssl?: any;
}

export const dbConfig: DatabaseConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'itoshu',
  password: process.env.DB_PASSWORD || 'zatint_6487',
  database: process.env.DB_NAME || 'attendance',
  timezone: '+09:00',
  waitForConnections: true,
  connectionLimit: 10,
  acquireTimeout: 60000,  // 60秒
  timeout: 60000,         // 60秒
  reconnect: true,
  ssl: false,             // ローカルMariaDBなのでSSL無効
};

export const createPool = () => {
  logger.info('Creating database connection pool', {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    database: dbConfig.database
  });

  return mysql.createPool(dbConfig);
};

export const testConnection = async (pool: mysql.Pool): Promise<boolean> => {
  const maxRetries = 5;  // リトライ回数を減らして早く結果を得る
  const retryDelay = 3000; // 3秒間隔

  logger.info('Testing database connection...', {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    database: dbConfig.database
  });

  for (let i = 1; i <= maxRetries; i++) {
    try {
      logger.info(`Connection attempt ${i}/${maxRetries}...`);
      const connection = await pool.getConnection();
      await connection.ping();
      
      // 接続成功時に基本情報を取得
      const [rows] = await connection.execute('SELECT VERSION() as version, NOW() as current_time');
      connection.release();
      
      logger.info('Database connection successful!', {
        attempt: i,
        serverInfo: rows
      });
      return true;
    } catch (error: any) {
      const errorInfo = {
        attempt: i,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        message: error.message,
        host: dbConfig.host,
        port: dbConfig.port
      };
      
      logger.warn(`Database connection failed (attempt ${i}/${maxRetries})`, errorInfo);
      
      // 特定のエラーコードに対する詳細な診断
      if (error.code === 'ECONNREFUSED') {
        logger.error('Connection refused - Check if MySQL server is running and accessible');
      } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        logger.error('Access denied - Check username and password');
      } else if (error.code === 'ENOTFOUND') {
        logger.error('Host not found - Check hostname/IP address');
      } else if (error.code === 'ETIMEDOUT') {
        logger.error('Connection timeout - Check network connectivity and firewall');
      }
      
      if (i === maxRetries) {
        logger.error('Database connection failed after all retries', errorInfo);
        return false;
      }
      
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  return false;
};
