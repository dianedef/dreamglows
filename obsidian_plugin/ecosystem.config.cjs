module.exports = {
  apps: [{
    name: "obsidian---goalflowz",
    cwd: "/home/claude/obsidian---goalflowz",
    script: "bash",
    args: ["-lc", "export PORT=3003 && flox activate -- bash -lc 'pnpm exec vite --port 3003 --host'"],
    env: {
      PORT: 3003
    },
    autorestart: true,
    max_restarts: 3,
    min_uptime: "10s",
    restart_delay: 2000,
    watch: false
  }]
};
