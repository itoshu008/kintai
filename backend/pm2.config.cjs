const path = require('path');
module.exports = {
  apps: [{
    name: 'kintai-api',
    cwd: path.join(__dirname, 'dist'),  // dist を作業ディレクトリに
    script: 'server.js',                // 本体が index.js なら 'index.js'
    instances: 1,
    exec_mode: 'fork',
    env: {
      PORT: '8001',
      NODE_ENV: 'production',
      DEV_API_ENABLED: 'false',         // 必要に応じて true/false
      DEV_TOKEN: '',
      KINTAI_DATA_DIR: '/srv/kintai/data'   // ★固定データパス
    },
    env_development: {
      PORT: '8001',
      NODE_ENV: 'development',
      DEV_API_ENABLED: 'true',
      DEV_TOKEN: 'dev-token-123',
      KINTAI_DATA_DIR: '/srv/kintai/data'
    },
    env_production: {
      PORT: '8001',
      NODE_ENV: 'production',
      DEV_API_ENABLED: 'false',
      DEV_TOKEN: '',
      KINTAI_DATA_DIR: '/srv/kintai/data'
    },
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
    max_restarts: 10
  }]
};
