module.exports = {
  apps: [{
    name: 'kintai-api',
    cwd: __dirname,
    script: 'dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: { 
      PORT: '8001', 
      NODE_ENV: 'production' 
    },
    env_development: {
      PORT: '8001',
      NODE_ENV: 'development'
    },
    env_production: {
      PORT: '8001',
      NODE_ENV: 'production'
    },
    // ログ設定
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // 自動再起動設定
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'data'],
    
    // メモリ制限
    max_memory_restart: '1G',
    
    // 再起動設定
    min_uptime: '10s',
    max_restarts: 10,
    
    // クラスターモード（必要に応じて）
    // instances: 'max',
    // exec_mode: 'cluster'
  }]
};
