/* eslint-disable @typescript-eslint/no-require-imports */
// Nacte .env souboru pro PM2
require("dotenv").config();

module.exports = {
  apps: [
    {
      name: "keep-brain",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3011",
      cwd: "/www/hosting/muzx.cz/keep",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3011,
        DATABASE_URL: process.env.DATABASE_URL,
        ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
        ENCRYPTION_SALT: process.env.ENCRYPTION_SALT,
        REDIS_URL: process.env.REDIS_URL,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      },
    },
    {
      name: "keep-brain-worker",
      script: "worker/main.py",
      interpreter: "worker/venv/bin/python",
      cwd: "/www/hosting/muzx.cz/keep",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        DATABASE_URL: process.env.DATABASE_URL,
        REDIS_URL: process.env.REDIS_URL,
      },
    },
    {
      name: "keep-brain-ai-worker",
      script: "node_modules/.bin/tsx",
      args: "worker/ai-worker.ts",
      cwd: "/www/hosting/muzx.cz/keep",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        DATABASE_URL: process.env.DATABASE_URL,
        REDIS_URL: process.env.REDIS_URL,
        ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
        ENCRYPTION_SALT: process.env.ENCRYPTION_SALT,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      },
    },
  ],
};
