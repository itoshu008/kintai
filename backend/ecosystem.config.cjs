module.exports = {
  apps: [{
    name: 'attendance-app-shadow',
    script: 'dist/index.js',
    cwd: 'E:\\プログラム\\kintai\\kintai-clone\\backend',
    env: {
      HOST: "127.0.0.1",
      PORT: "8001",
      NODE_ENV: "production",
      DATA_DIR: "E:\\プログラム\\kintai\\kintai-clone\\data-shadow",
      FRONTEND_PATH: "E:\\プログラム\\kintai\\kintai-clone\\frontend\\dist",
      READ_ONLY: "0",
      BACKUP_ENABLED: "1",
      BACKUP_INTERVAL_MINUTES: "5",
      CORS_ORIGIN: "*"
    }
  }]
};
