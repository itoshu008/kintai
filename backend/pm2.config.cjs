const path = require('path');
module.exports = {
  apps: [{
    name: 'kintai-api',
    cwd: path.join(__dirname, 'dist'),
    script: 'index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      PORT: '8001',
      NODE_ENV: 'production',
      KINTAI_DATA_DIR: '/srv/kintai/data'
    },
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
