module.exports = {
  apps: [
    {
      name: "kintai-api",
      cwd: "/home/zatint1991-hvt55/zatint1991.com/kintai/backend",
      script: "dist/index.js",          // ← ビルド成果物
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "4001",
        TZ: "Asia/Tokyo"
      }
    }
  ]
};
