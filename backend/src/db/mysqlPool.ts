import mysql from 'mysql2/promise';
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'itoshu',
  password: process.env.DB_PASSWORD || 'zatint_6487',
  database: process.env.DB_NAME || 'kintai_db',
  charset: 'utf8mb4',
  timezone: '+09:00',
  waitForConnections: true,
  connectionLimit: 10,
});
export default pool;

