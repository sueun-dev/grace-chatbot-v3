module.exports = {
  apps: [{
    name: 'grace-chatbot',
    script: 'npm',
    args: 'start',
    cwd: __dirname,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001  // 3001번 포트로 설정
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    time: true,
    max_restarts: 10
  }]
}
