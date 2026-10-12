/**
 * MatchLens AI - Background Worker Runner
 * 
 * Provides resilient, scalable background job processing with:
 * 1. Transactional Outbox publishing.
 * 2. Competing-consumer job claiming with optimistic concurrency.
 * 3. Heartbeat tracking & automated recovery from crashed worker instances.
 * 4. Graceful shutdown on SIGTERM / SIGINT signals.
 * 5. Bounded concurrency to protect database and memory limits.
 */

import { Store } from "../storage/store";
import { processResumeJob } from "./processor";
import { QueueJobPayload, WorkerOptions } from "./types";
import { logger } from "../logger";

export interface IterationResult {
  claimedCount: number;
  completedCount: number;
  failedCount: number;
  recoveredStaleCount: number;
}

/**
 * Runs a single polling pass of the worker:
 * - Recovers any crashed/stale jobs.
 * - Claims up to batchLimit queued jobs.
 * - Executes them concurrently up to concurrency limit.
 */
export async function runWorkerIteration(
  concurrency: number = 5,
  staleTimeoutMs: number = 5 * 60 * 1000
): Promise<IterationResult> {
  const result: IterationResult = {
    claimedCount: 0,
    completedCount: 0,
    failedCount: 0,
    recoveredStaleCount: 0,
  };

  // 1. Recover stale jobs from crashed workers
  const { recoveredCount } = await Store.recoverStaleProcessingJobs(staleTimeoutMs);
  result.recoveredStaleCount = recoveredCount;
  if (recoveredCount > 0) {
    logger.info(`Recovered ${recoveredCount} stale processing jobs`, {
      event: "worker.stale_jobs_recovered",
      component: "worker",
      recoveredCount,
    });
  }

  // 2. Fetch pending queued jobs
  const queuedJobs = await Store.getPendingProcessingJobs(concurrency);
  if (queuedJobs.length === 0) {
    return result;
  }

  // 3. Process jobs with bounded concurrency
  const promises = queuedJobs.map(async (job) => {
    // Atomically claim the job to prevent other workers from processing it
    const claimed = await Store.claimProcessingJob(job.id);
    if (!claimed) {
      return; // Already claimed by competing worker
    }

    result.claimedCount++;

    logger.info(`Claimed processing job ${claimed.id}`, {
      event: "job.claimed",
      component: "worker",
      processingJobId: claimed.id,
      orgId: claimed.organizationId,
      jobId: claimed.jobId,
      retryAttempt: claimed.attempts,
    });

    const payload: QueueJobPayload = {
      processingJobId: claimed.id,
      organizationId: claimed.organizationId,
      jobId: claimed.jobId,
      documentId: claimed.documentId,
      storageKey: "",
      fileName: claimed.fileName,
      fileHash: claimed.fileHash,
    };

    const startTime = Date.now();
    const jobResult = await processResumeJob(payload);
    const durationMs = Date.now() - startTime;

    if (jobResult.status === "COMPLETED" || jobResult.status === "PARTIALLY_FAILED") {
      result.completedCount++;
      logger.info(`Successfully processed job ${claimed.id}`, {
        event: "job.completed",
        component: "worker",
        processingJobId: claimed.id,
        orgId: claimed.organizationId,
        jobId: claimed.jobId,
        durationMs,
        stage: "completed",
      });
    } else {
      result.failedCount++;
      logger.error(`Failed processing job ${claimed.id}`, {
        event: "job.failed",
        component: "worker",
        processingJobId: claimed.id,
        orgId: claimed.organizationId,
        jobId: claimed.jobId,
        durationMs,
        errorCode: jobResult.errorCode,
      });
    }
  });

  await Promise.all(promises);
  return result;
}

/**
 * Publishes pending outbox events. In outbox mode, marks them delivered.
 * When Redis BullMQ is configured, this pushes items to the BullMQ queue.
 */
export async function flushOutboxEvents(batchLimit: number = 20): Promise<number> {
  const outboxEvents = await Store.getPendingOutboxEvents(batchLimit);
  let publishedCount = 0;

  for (const event of outboxEvents) {
    try {
      // In standalone outbox mode, the database queue is the source of truth
      await Store.markOutboxEventPublished(event.id);
      publishedCount++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Failed publishing outbox event ${event.id}`, {
        event: "outbox.publish_failed",
        component: "worker",
        outboxId: event.id,
        orgId: event.organizationId,
      }, err);
      await Store.markOutboxEventFailed(event.id, message);
    }
  }

  if (publishedCount > 0) {
    logger.debug(`Flushed ${publishedCount} outbox events`, {
      event: "outbox.flushed",
      component: "worker",
      publishedCount,
    });
  }

  return publishedCount;
}

let isRunning = false;
let stopRequested = false;

/**
 * Starts an ongoing background worker loop.
 */
export async function startWorkerLoop(options?: WorkerOptions): Promise<void> {
  if (isRunning) {
    logger.warn("Worker loop is already running.", {
      event: "worker.already_running",
      component: "worker",
    });
    return;
  }

  isRunning = true;
  stopRequested = false;

  const concurrency = options?.concurrency || 5;
  const pollIntervalMs = options?.pollIntervalMs || 1000;
  const staleTimeoutMs = options?.staleHeartbeatTimeoutMs || 5 * 60 * 1000;

  logger.info(`Started MatchLens background worker (concurrency: ${concurrency}, poll: ${pollIntervalMs}ms)`, {
    event: "worker.started",
    component: "worker",
    concurrency,
    pollIntervalMs,
    staleTimeoutMs,
  });

  const shutdownHandler = () => {
    logger.info("Graceful shutdown initiated...", {
      event: "worker.shutdown_initiated",
      component: "worker",
    });
    stopRequested = true;
  };

  process.on("SIGINT", shutdownHandler);
  process.on("SIGTERM", shutdownHandler);

  try {
    while (!stopRequested) {
      try {
        await flushOutboxEvents();
        const iter = await runWorkerIteration(concurrency, staleTimeoutMs);
        if (iter.claimedCount > 0 || iter.recoveredStaleCount > 0) {
          logger.info(
            `Iteration: ${iter.claimedCount} claimed, ${iter.completedCount} completed, ${iter.failedCount} failed, ${iter.recoveredStaleCount} recovered.`,
            {
              event: "worker.iteration_summary",
              component: "worker",
              claimedCount: iter.claimedCount,
              completedCount: iter.completedCount,
              failedCount: iter.failedCount,
              recoveredCount: iter.recoveredStaleCount,
            }
          );
        }
      } catch (loopErr) {
        logger.error("Error in worker loop iteration", {
          event: "worker.iteration_error",
          component: "worker",
        }, loopErr);
      }

      if (!stopRequested) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      }
    }
  } finally {
    isRunning = false;
    process.removeListener("SIGINT", shutdownHandler);
    process.removeListener("SIGTERM", shutdownHandler);
    logger.info("Worker stopped cleanly.", {
      event: "worker.stopped",
      component: "worker",
    });
  }
}
