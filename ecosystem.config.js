module.exports = {
  apps: [
    {
      name: "keep-brain",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3010",
      cwd: "/var/www/keep-brain",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3010,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3010,
      },
    },
    {
      name: "keep-brain-worker",
      script: "worker/main.py",
      interpreter: "worker/venv/bin/python",
      cwd: "/var/www/keep-brain",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
}
