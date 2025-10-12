/**
 * PM2設定ファイル - 勤怠管理システム
 * バックエンド（フロントエンド静的ファイル配信含む）
 */
module.exports = {
  apps: [
    {
      name: 'kintai-backend',
      script: './backend/dist/server.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
          env: {
            NODE_ENV: 'production',
            PORT: 8001,
            HOST: '0.0.0.0',
            TZ: 'Asia/Tokyo'
          },
      env_development: {
        NODE_ENV: 'development',
        PORT: 8001,
        HOST: '127.0.0.1',
        TZ: 'Asia/Tokyo'
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 5000,
      listen_timeout: 3000
    }
  ]
};

