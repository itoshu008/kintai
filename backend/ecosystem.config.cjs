module.exports = {
  apps: [{
    name: 'attendance-app-shadow',
    script: '/usr/bin/node',
    args: ['dist/index.js'],
    interpreter: 'none',
    cwd: '/home/itoshu/kintai-app/backend',
    env: {
      HOST: "127.0.0.1",
      PORT: "8001",
      NODE_ENV: "production",
      DATA_DIR: "/home/itoshu/kintai-app/data-shadow",
      FRONTEND_PATH: "/home/itoshu/kintai-app/public",
      READ_ONLY: "0",
      BACKUP_ENABLED: "1",
      BACKUP_INTERVAL_MINUTES: "5",
      CORS_ORIGIN: "*"
    }
  }]
};
