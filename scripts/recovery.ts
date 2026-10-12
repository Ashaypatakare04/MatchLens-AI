/**
 * MatchLens AI - Operational Recovery & SRE Diagnostic Tool
 * 
 * Provides CLI commands for operators to inspect system health,
 * recover stale jobs, and unblock backlogged queues.
 * 
 * Usage:
 *   npx tsx scripts/recovery.ts status
 *   npx tsx scripts/recovery.ts recover-stale [timeoutMs]
 *   npx tsx scripts/recovery.ts flush-outbox [batchLimit]
 *   npx tsx scripts/recovery.ts retry-job <organizationId> <processingJobId>
 */

import { Store } from "../lib/storage/store";
import { flushOutboxEvents } from "../lib/queue/worker";
import { getQueueSystemMetrics } from "../lib/observability/metrics";
import { closeDb } from "../lib/db";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "status";

  console.log(`=== MatchLens AI: SRE Operational Tool [Command: ${command}] ===\n`);

  switch (command) {
    case "status": {
      const metrics = await getQueueSystemMetrics();
      console.log("Current Background System Metrics:");
      console.log(JSON.stringify(metrics, null, 2));
      break;
    }

    case "recover-stale": {
      const timeoutMs = args[1] ? parseInt(args[1], 10) : 5 * 60 * 1000;
      console.log(`Recovering stale processing jobs (heartbeat threshold: ${timeoutMs}ms)...`);
      const result = await Store.recoverStaleProcessingJobs(timeoutMs);
      console.log(`Successfully recovered ${result.recoveredCount} jobs to QUEUED status.`);
      console.log(`Failed ${result.failedCount} expired jobs that exceeded max attempts.`);
      break;
    }

    case "flush-outbox": {
      const limit = args[1] ? parseInt(args[1], 10) : 50;
      console.log(`Flushing up to ${limit} pending outbox events...`);
      const count = await flushOutboxEvents(limit);
      console.log(`Published ${count} outbox events successfully.`);
      break;
    }

    case "retry-job": {
      const orgId = args[1];
      const jobId = args[2];
      if (!orgId || !jobId) {
        console.error("Usage: npx tsx scripts/recovery.ts retry-job <organizationId> <processingJobId>");
        process.exit(1);
      }
      console.log(`Attempting to retry processing job ${jobId} for org ${orgId}...`);
      const retried = await Store.retryProcessingJob(orgId, jobId);
      if (retried) {
        console.log(`Job successfully reset to QUEUED. Attempt: ${retried.attempts}/${retried.maxAttempts}`);
      } else {
        console.error("Failed to retry job. Verify that job exists, is in FAILED status, and the resume document has not been purged.");
        process.exit(1);
      }
      break;
    }

    default:
      console.error(`Unknown command: "${command}". Available: status, recover-stale, flush-outbox, retry-job`);
      process.exit(1);
  }

  await closeDb();
  console.log("\nOperation completed successfully.");
}

main().catch(async (err) => {
  console.error("Fatal operational error:", err);
  await closeDb();
  process.exit(1);
});
