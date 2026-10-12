/**
 * MatchLens AI - Background Queue & Worker Monitoring API
 * 
 * Exposes real-time system metrics for background resume processing:
 * - Queue depth & oldest job age
 * - Processing, completed, and failed counts
 * - Retry rates and failure breakdown
 * - Outbox backlog & publisher status
 * - Worker heartbeat freshness & stale job counts
 * 
 * Security:
 * - Restricted to ADMIN users or authorized monitoring agents (MONITORING_API_KEY).
 * - Emits zero candidate PII or raw resume data.
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getQueueSystemMetrics } from "@/lib/observability/metrics";
import { extractOrGenerateRequestId, logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { requestId } = extractOrGenerateRequestId(request);

  // 1. Authorize via Monitoring API Key or Admin Session
  const monitoringApiKey = process.env.MONITORING_API_KEY;
  const authHeader = request.headers.get("authorization");
  let isAuthorized = false;

  if (monitoringApiKey && authHeader === `Bearer ${monitoringApiKey}`) {
    isAuthorized = true;
  } else {
    const user = await getSessionUser(request);
    if (user && user.role === "ADMIN") {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    logger.warn("Unauthorized access attempt to monitoring metrics", {
      event: "auth.monitoring_rejected",
      requestId,
      statusCode: 403,
    });
    return NextResponse.json(
      { error: "Forbidden: Admin or authorized monitoring credentials required." },
      { status: 403, headers: { "x-request-id": requestId } }
    );
  }

  try {
    const metrics = await getQueueSystemMetrics();

    logger.info("Monitoring metrics retrieved", {
      event: "monitoring.metrics_fetched",
      requestId,
      queuedJobs: metrics.jobs.queuedCount,
      processingJobs: metrics.jobs.processingCount,
      workerStatus: metrics.worker.status,
    });

    return NextResponse.json(metrics, {
      status: 200,
      headers: {
        "x-request-id": requestId,
        "cache-control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err: unknown) {
    logger.error("Failed to query monitoring metrics", {
      event: "monitoring.query_failed",
      requestId,
      statusCode: 500,
    }, err);

    return NextResponse.json(
      { error: "Internal server error querying monitoring metrics." },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }
}
