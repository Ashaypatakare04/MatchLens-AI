/**
 * MatchLens AI - Standalone Background Worker Process
 * 
 * Entrypoint for long-running worker deployments (e.g. Docker, Railway, Render, Fly.io, ECS).
 * Run via: npm run worker
 */

import { startWorkerLoop } from "../lib/queue/worker";

async function main() {
  console.log("=== MatchLens AI: Background Resume Processing Worker ===");
  const concurrency = parseInt(process.env.WORKER_CONCURRENCY || "5", 10);
  const pollIntervalMs = parseInt(process.env.WORKER_POLL_INTERVAL_MS || "1000", 10);

  await startWorkerLoop({
    concurrency,
    pollIntervalMs,
  });
}

main().catch((err) => {
  console.error("Worker process terminated with fatal error:", err);
  process.exit(1);
});
