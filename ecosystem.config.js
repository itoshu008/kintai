// ecosystem.config.js - PM2設定ファイル
module.exports = {
  apps: [
    {
      name: 'kintai-backend',
      script: './backend/dist/index.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 8001,
        HOST: '127.0.0.1'
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'kintai-frontend',
      script: './frontend/server.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '127.0.0.1'
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      watch: false,
      max_memory_restart: '512M',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};

