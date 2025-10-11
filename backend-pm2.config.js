module.exports = {
  apps: [
    {
      name: "kintai-backend",
      cwd: "./backend",
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        HOST: "127.0.0.1",
        PORT: "8001",
        TZ: "Asia/Tokyo",
        BACKUP_ENABLED: "1",
        BACKUP_INTERVAL_MINUTES: "60",
        BACKUP_MAX_KEEP: "24",
        FRONTEND_PATH: "../frontend/dist"
      },
      env_development: {
        NODE_ENV: "development",
        HOST: "127.0.0.1",
        PORT: "8001",
        TZ: "Asia/Tokyo",
        BACKUP_ENABLED: "1",
        BACKUP_INTERVAL_MINUTES: "60",
        BACKUP_MAX_KEEP: "24",
        FRONTEND_PATH: "../frontend/dist"
      },
      error_file: "./logs/backend-error.log",
      out_file: "./logs/backend-out.log",
      log_file: "./logs/backend-combined.log",
      time: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 4000,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    }
  ]
};

