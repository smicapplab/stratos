module.exports = {
  apps: [
    {
      name: 'stratos-dev',
      script: 'node_modules/vite/bin/vite.js',
      args: 'dev --host 0.0.0.0 --port 5180',
      env: {
        NODE_ENV: 'development',
        PORT: 5180
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
};
