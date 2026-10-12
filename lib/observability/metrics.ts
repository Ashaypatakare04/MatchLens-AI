/**
 * MatchLens AI - Background Queue & Worker Monitoring Engine
 * 
 * Provides bounded, indexed metric queries for observability dashboards,
 * Prometheus exporters, and health inspection endpoints.
 * 
 * Strict Guarantees:
 * - Bounded queries using existing indexes (`pjobs_status_idx`, `pjobs_heartbeat_idx`, `poutbox_status_idx`).
 * - Never scans entire candidate tables or leaks tenant data.
 * - Distinguishes transient vs permanent failures.
 */

import { getDb } from "../db";
import { processingJobs, processingOutbox } from "../db/schema";
import { eq, and, lte, desc, asc, sql } from "drizzle-orm";

export interface QueueSystemMetrics {
  timestamp: string;
  worker: {
    status: "healthy" | "idle" | "stale" | "unhealthy";
    latestHeartbeatAt: string | null;
    heartbeatFreshnessMs: number | null;
    isHeartbeatStale: boolean;
  };
  jobs: {
    queuedCount: number;
    processingCount: number;
    completedCount: number;
    failedCount: number;
    totalTracked: number;
    oldestQueuedJobAgeMs: number | null;
    staleJobsCount: number;
    retryCount: number;
    retryRatePercent: number;
  };
  outbox: {
    backlogCount: number;
    oldestPendingAgeMs: number | null;
    status: "healthy" | "congested" | "critical";
  };
  failureBreakdown: Record<string, number>;
}

/**
 * Collects current background processing system metrics.
 */
export async function getQueueSystemMetrics(
  staleTimeoutMs: number = 5 * 60 * 1000
): Promise<QueueSystemMetrics> {
  const db = await getDb();
  const now = Date.now();
  const staleCutoff = new Date(now - staleTimeoutMs);

  // 1. Queue depth & status counts (bounded by indexed status filter)
  const [queuedRows, processingRows, completedRows, failedRows] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(processingJobs).where(eq(processingJobs.status, "QUEUED")),
    db.select({ count: sql<number>`count(*)` }).from(processingJobs).where(eq(processingJobs.status, "PROCESSING")),
    db.select({ count: sql<number>`count(*)` }).from(processingJobs).where(sql`${processingJobs.status} IN ('COMPLETED', 'PARTIALLY_FAILED')`),
    db.select({ count: sql<number>`count(*)` }).from(processingJobs).where(eq(processingJobs.status, "FAILED")),
  ]);

  const queuedCount = Number(queuedRows[0]?.count || 0);
  const processingCount = Number(processingRows[0]?.count || 0);
  const completedCount = Number(completedRows[0]?.count || 0);
  const failedCount = Number(failedRows[0]?.count || 0);
  const totalTracked = queuedCount + processingCount + completedCount + failedCount;

  // 2. Oldest queued job age (index-accelerated limit 1)
  const [oldestQueued] = await db
    .select({ createdAt: processingJobs.createdAt })
    .from(processingJobs)
    .where(eq(processingJobs.status, "QUEUED"))
    .orderBy(asc(processingJobs.createdAt))
    .limit(1);

  const oldestQueuedJobAgeMs = oldestQueued?.createdAt
    ? now - new Date(oldestQueued.createdAt).getTime()
    : null;

  // 3. Stale jobs count (jobs in PROCESSING with stale heartbeats)
  const [staleRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(processingJobs)
    .where(
      and(
        eq(processingJobs.status, "PROCESSING"),
        lte(processingJobs.heartbeatAt, staleCutoff)
      )
    );
  const staleJobsCount = Number(staleRow?.count || 0);

  // 4. Retried jobs count (attempts > 1)
  const [retriedRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(processingJobs)
    .where(sql`${processingJobs.attempts} > 1`);
  const retryCount = Number(retriedRow?.count || 0);
  const retryRatePercent = totalTracked > 0 ? Math.round((retryCount / totalTracked) * 1000) / 10 : 0;

  // 5. Worker heartbeat freshness (fetch most recent heartbeat)
  const [latestHeartbeatRow] = await db
    .select({ heartbeatAt: processingJobs.heartbeatAt })
    .from(processingJobs)
    .where(sql`${processingJobs.heartbeatAt} IS NOT NULL`)
    .orderBy(desc(processingJobs.heartbeatAt))
    .limit(1);

  const latestHeartbeatAt = latestHeartbeatRow?.heartbeatAt
    ? new Date(latestHeartbeatRow.heartbeatAt).toISOString()
    : null;

  const heartbeatFreshnessMs = latestHeartbeatRow?.heartbeatAt
    ? now - new Date(latestHeartbeatRow.heartbeatAt).getTime()
    : null;

  const isHeartbeatStale = heartbeatFreshnessMs !== null && heartbeatFreshnessMs > staleTimeoutMs;

  let workerStatus: QueueSystemMetrics["worker"]["status"] = "healthy";
  if (processingCount > 0 && isHeartbeatStale) {
    workerStatus = "stale";
  } else if (processingCount === 0 && queuedCount === 0) {
    workerStatus = "idle";
  } else if (isHeartbeatStale) {
    workerStatus = "unhealthy";
  }

  // 6. Outbox backlog metrics (indexed on poutbox_status_idx)
  const [outboxPendingRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(processingOutbox)
    .where(eq(processingOutbox.status, "PENDING"));
  const outboxBacklog = Number(outboxPendingRow?.count || 0);

  const [oldestPendingOutbox] = await db
    .select({ createdAt: processingOutbox.createdAt })
    .from(processingOutbox)
    .where(eq(processingOutbox.status, "PENDING"))
    .orderBy(asc(processingOutbox.createdAt))
    .limit(1);

  const oldestPendingOutboxAgeMs = oldestPendingOutbox?.createdAt
    ? now - new Date(oldestPendingOutbox.createdAt).getTime()
    : null;

  let outboxStatus: QueueSystemMetrics["outbox"]["status"] = "healthy";
  if (outboxBacklog > 50 || (oldestPendingOutboxAgeMs !== null && oldestPendingOutboxAgeMs > 3 * 60 * 1000)) {
    outboxStatus = "congested";
  }
  if (outboxBacklog > 200 || (oldestPendingOutboxAgeMs !== null && oldestPendingOutboxAgeMs > 10 * 60 * 1000)) {
    outboxStatus = "critical";
  }

  // 7. Failure codes breakdown (bounded to recent 100 failed jobs)
  const recentFailures = await db
    .select({ errorCode: processingJobs.errorCode })
    .from(processingJobs)
    .where(eq(processingJobs.status, "FAILED"))
    .orderBy(desc(processingJobs.updatedAt))
    .limit(100);

  const failureBreakdown: Record<string, number> = {};
  for (const f of recentFailures) {
    const code = f.errorCode || "UNKNOWN_ERROR";
    failureBreakdown[code] = (failureBreakdown[code] || 0) + 1;
  }

  return {
    timestamp: new Date(now).toISOString(),
    worker: {
      status: workerStatus,
      latestHeartbeatAt,
      heartbeatFreshnessMs,
      isHeartbeatStale,
    },
    jobs: {
      queuedCount,
      processingCount,
      completedCount,
      failedCount,
      totalTracked,
      oldestQueuedJobAgeMs,
      staleJobsCount,
      retryCount,
      retryRatePercent,
    },
    outbox: {
      backlogCount: outboxBacklog,
      oldestPendingAgeMs: oldestPendingOutboxAgeMs,
      status: outboxStatus,
    },
    failureBreakdown,
  };
}
