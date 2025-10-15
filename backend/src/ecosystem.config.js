module.exports = {
  apps: [{
    name: 'kintai-api',
    script: '/home/zatint1991-hvt55/zatint1991.com/backend/dist/server.js',
    instances: 2,             // 余裕があれば 2 以上
    exec_mode: 'cluster',
    env: { NODE_ENV: 'production', HOST: '127.0.0.1', PORT: 8001 }
  }]
}
