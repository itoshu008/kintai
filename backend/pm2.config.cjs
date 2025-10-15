module.exports = {
  apps: [{
    name: "kintai-api",
    script: "dist/server.js",
    cwd: "/home/zatint1991-hvt55/zatint1991.com/backend",
    instances: 1,
    exec_mode: "cluster",
    env: { 
      NODE_ENV: "production", 
      PORT: "8001", 
      HOST: "0.0.0.0",
      KINTAI_DATA_DIR: "/srv/kintai/data"
    },
    time: true,
    out_file: "/home/itoshu/.pm2/logs/kintai-api-out.log",
    error_file: "/home/itoshu/.pm2/logs/kintai-api-error.log",
    merge_logs: true
  }]
}
