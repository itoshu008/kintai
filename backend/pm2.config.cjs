module.exports = {
  apps: [{
    name: 'kintai-api',
    script: 'dist/index.js',
    cwd: '/home/itoshu/projects/kintai/kintai/backend',
    exec_mode: 'cluster',
    instances: 2,                    // CPUコア数に応じて調整
    time: true,
    env: { 
      NODE_ENV: 'production', 
      PORT: '4000', 
      HOST: '0.0.0.0',
      DB_HOST: 'localhost',
      DB_PORT: '3306',
      DB_USER: 'itoshu',
      DB_PASSWORD: 'zatint_6487',
      DB_NAME: 'kintai'
    },

    // 起動完了を待つ
    wait_ready: true,
    listen_timeout: 15000,
    kill_timeout: 10000,

    // 安定化設定
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,

    // ログ設定
    out_file: '/home/itoshu/.pm2/logs/kintai-api-out.log',
    error_file: '/home/itoshu/.pm2/logs/kintai-api-error.log',
    log_file: '/home/itoshu/.pm2/logs/kintai-api-combined.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // 監視設定
    watch: false,
    ignore_watch: ['node_modules', 'logs', '*.log'],
    
    // メモリ制限
    max_memory_restart: '500M',
    
    // 自動再起動設定
    autorestart: true,
    
    // 環境変数ファイル
    env_file: '.env'
  }]
}