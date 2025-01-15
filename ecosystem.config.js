module.exports = {
  apps: [{
    name: 'ik-blog-server',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      // 默认环境配置（开发环境）
      NODE_ENV: 'development',
      PORT: 5000
    },
    env_production: {
      // 生产环境配置
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: 'logs/err.log',    // 错误日志路径
    out_file: 'logs/out.log',      // 输出日志路径
    time: true,                    // 为日志添加时间戳
    log_date_format: 'YYYY-MM-DD HH:mm:ss', // 日志日期格式
  }]
} 