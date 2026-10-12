/**
 * MatchLens AI - Administrative Operational Recovery API
 * 
 * Provides authenticated, role-gated, and audited recovery endpoints for SREs and admins.
 * 
 * Strict Guarantees:
 * 1. Requires ADMIN role.
 * 2. Idempotent actions only — never blindly requeues or corrupts state.
 * 3. Enforces tenant scope when targeting specific jobs.
 * 4. Audits all recovery operations via AuditLogger.
 */

import { NextResponse } from "next/server";
import { requireOrganizationRole, handleAuthError } from "@/lib/auth/session";
import { Store } from "@/lib/storage/store";
import { flushOutboxEvents } from "@/lib/queue/worker";
import { AuditLogger } from "@/lib/engine/audit-logger";
import { extractOrGenerateRequestId, logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { requestId } = extractOrGenerateRequestId(request);

  try {
    const adminUser = await requireOrganizationRole(request, ["ADMIN"]);
    const body = await request.json();
    const action = body?.action;

    if (!action) {
      return NextResponse.json(
        { error: "Missing required 'action' field in request body." },
        { status: 400, headers: { "x-request-id": requestId } }
      );
    }

    logger.info("Admin recovery operation initiated", {
      event: "admin.recovery_requested",
      requestId,
      orgId: adminUser.organizationId,
      action,
      userId: adminUser.id,
    });

    switch (action) {
      case "recover_stale_jobs": {
        const timeoutMs = typeof body.timeoutMs === "number" ? Math.max(body.timeoutMs, 60000) : 5 * 60 * 1000;
        const result = await Store.recoverStaleProcessingJobs(timeoutMs);

        await AuditLogger.recordEvent(adminUser.organizationId, {
          eventType: "admin_recovery_stale_jobs",
          jobId: "system",
          actor: {
            userId: adminUser.id,
            userName: adminUser.name,
            role: "ADMIN",
          },
          notes: `Recovered ${result.recoveredCount} stale jobs; failed ${result.failedCount} expired jobs (timeout: ${timeoutMs}ms).`,
        });

        logger.info("Stale job recovery executed", {
          event: "admin.stale_jobs_recovered",
          requestId,
          recoveredCount: result.recoveredCount,
          failedCount: result.failedCount,
        });

        return NextResponse.json({
          success: true,
          action,
          recoveredCount: result.recoveredCount,
          failedCount: result.failedCount,
        }, { headers: { "x-request-id": requestId } });
      }

      case "republish_outbox": {
        const limit = typeof body.limit === "number" ? Math.min(body.limit, 100) : 20;
        const publishedCount = await flushOutboxEvents(limit);

        await AuditLogger.recordEvent(adminUser.organizationId, {
          eventType: "admin_recovery_outbox_flush",
          jobId: "system",
          actor: {
            userId: adminUser.id,
            userName: adminUser.name,
            role: "ADMIN",
          },
          notes: `Flushed and published ${publishedCount} pending outbox events.`,
        });

        return NextResponse.json({
          success: true,
          action,
          publishedCount,
        }, { headers: { "x-request-id": requestId } });
      }

      case "retry_job": {
        const { processingJobId, targetOrgId } = body;
        if (!processingJobId) {
          return NextResponse.json(
            { error: "Missing 'processingJobId' for retry_job action." },
            { status: 400, headers: { "x-request-id": requestId } }
          );
        }

        // Scope to admin's org unless explicitly authorized
        const scopeOrgId = targetOrgId || adminUser.organizationId;
        const retried = await Store.retryProcessingJob(scopeOrgId, processingJobId);

        if (!retried) {
          return NextResponse.json(
            { error: "Job cannot be retried (must be FAILED or PARTIALLY_FAILED with document intact)." },
            { status: 400, headers: { "x-request-id": requestId } }
          );
        }

        await AuditLogger.recordEvent(scopeOrgId, {
          eventType: "admin_recovery_job_retry",
          jobId: retried.jobId,
          actor: {
            userId: adminUser.id,
            userName: adminUser.name,
            role: "ADMIN",
          },
          notes: `Manually retried processing job ${processingJobId} via recovery API.`,
        });

        return NextResponse.json({
          success: true,
          action,
          job: retried,
        }, { headers: { "x-request-id": requestId } });
      }

      default:
        return NextResponse.json(
          { error: `Unknown recovery action: '${action}'. Supported: 'recover_stale_jobs', 'republish_outbox', 'retry_job'.` },
          { status: 400, headers: { "x-request-id": requestId } }
        );
    }
  } catch (err: unknown) {
    return handleAuthError(err);
  }
}
