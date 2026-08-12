// PM2 process configuration for the Flouna API in production.
//
//   Build:   npm run build
//   DB:      DB_PROVIDER=postgresql npm run db:deploy
//   Start:   pm2 start ecosystem.config.cjs --env production
//   Logs:    pm2 logs flouna-api
//   Restart: pm2 reload flouna-api   (zero-downtime)
//   Boot:    pm2 startup && pm2 save   (restart on server reboot)
//
// Reads runtime config from the environment / a .env file in this directory.

module.exports = {
  apps: [
    {
      name: "flouna-api",
      script: "dist/index.js",
      node_args: "--env-file=.env",
      instances: 1, // single instance; raise to "max" once stateless workers are verified
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
      },
      // Health check via the API's /api/health endpoint is recommended at the
      // load-balancer / uptime-monitor level (Cloudflare, UptimeRobot, etc.).
    },
  ],
};
