module.exports = {
  apps: [
    {
      name: 'devtinder',
      script: 'src/app.js',
      interpreter: 'node',
      node_args:
        '--enable-source-maps --experimental-specifier-resolution=node',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
