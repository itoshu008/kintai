module.exports = {
  apps: [
    {
      name: "kintai-api",
      script: "dist/server.js",
      cwd: "/home/zatint1991-hvt55/zatint1991.com/backend",
      instances: 1,
      autorestart: true,
      node_args: [],
      env: {
        NODE_ENV: "production",
        PORT: "8001",
        KINTAI_DATA_DIR: "/srv/kintai/data"
      },
      max_memory_restart: "512M",
      watch: false,
      time: true,
      out_file: "/home/zatint1991-hvt55/.pm2/logs/kintai-api-out.log",
      error_file: "/home/zatint1991-hvt55/.pm2/logs/kintai-api-error.log",
      merge_logs: true
    }
  ]
}
