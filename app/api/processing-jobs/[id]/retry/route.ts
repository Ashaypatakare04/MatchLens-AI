import { NextRequest, NextResponse } from "next/server";
import { Store } from "@/lib/storage/store";
import { requireOrganizationRole, handleAuthError } from "@/lib/auth/session";

/**
 * POST /api/processing-jobs/[id]/retry
 * 
 * Requeues a failed or partially-failed processing job for re-evaluation.
 * Enforces ADMIN or RECRUITER role and organization ownership.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireOrganizationRole(req, ["ADMIN", "RECRUITER"]);
    const { id } = await params;

    const existing = await Store.getProcessingJob(user.organizationId, id);
    if (!existing) {
      return NextResponse.json({ error: "Processing job not found" }, { status: 404 });
    }

    if (existing.status !== "FAILED" && existing.status !== "PARTIALLY_FAILED") {
      return NextResponse.json(
        { error: `Cannot retry job with status "${existing.status}". Only FAILED or PARTIALLY_FAILED jobs are eligible.` },
        { status: 400 }
      );
    }

    const retried = await Store.retryProcessingJob(user.organizationId, id);
    if (!retried) {
      return NextResponse.json(
        { error: "Unable to retry processing job. Target document may have been purged or deleted." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      status: "QUEUED",
      message: "Processing job successfully requeued.",
      processingJobId: retried.id,
    });
  } catch (err: unknown) {
    return handleAuthError(err);
  }
}
