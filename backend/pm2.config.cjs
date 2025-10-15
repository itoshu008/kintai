module.exports = {
  apps: [{
    name: 'kintai-api',
    script: 'dist/server.js',
    cwd: '/home/zatint1991-hvt55/zatint1991.com/backend',
    exec_mode: 'cluster',            // 本番は cluster
    instances: 1,
    time: true,
    env: { NODE_ENV: 'production', PORT: '8001', HOST: '0.0.0.0' },

    // 起動完了を待つ（server.ts→process.send('ready') とペア）
    wait_ready: true,
    listen_timeout: 10000,
    kill_timeout: 5000,

    // 安定化
    min_uptime: 3000,
    exp_backoff_restart_delay: 1000,
    max_restarts: 20,

    // ログ
    out_file: '/home/itoshu/.pm2/logs/kintai-api-out.log',
    error_file: '/home/itoshu/.pm2/logs/kintai-api-error.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    watch: false
  }]
}