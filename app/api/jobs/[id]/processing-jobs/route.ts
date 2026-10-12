import { NextRequest, NextResponse } from "next/server";
import { Store } from "@/lib/storage/store";
import { requireAuthenticatedUser, handleAuthError } from "@/lib/auth/session";

/**
 * GET /api/jobs/[id]/processing-jobs
 * 
 * Lists processing jobs for a specific job requisition, enforcing organization ownership.
 * Supports pagination (limit, offset) and status filtering.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser(req);
    const { id: jobId } = await params;

    // Verify parent job belongs to user's organization
    const job = await Store.getJob(user.organizationId, jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const { searchParams } = req.nextUrl;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const status = searchParams.get("status") || undefined;

    const { items, total } = await Store.getProcessingJobsByJob(
      user.organizationId,
      jobId,
      { limit, offset, status }
    );

    // Sanitize items: exclude internal outbox metadata or raw paths
    const sanitizedItems = items.map((p) => ({
      id: p.id,
      jobId: p.jobId,
      documentId: p.documentId,
      candidateId: p.candidateId,
      fileName: p.fileName,
      fileSize: p.fileSize,
      status: p.status,
      currentStage: p.currentStage,
      progress: p.progress,
      attempts: p.attempts,
      maxAttempts: p.maxAttempts,
      errorCode: p.errorCode,
      errorMessage: p.errorMessage,
      createdAt: p.createdAt.toISOString(),
      startedAt: p.startedAt?.toISOString() || null,
      completedAt: p.completedAt?.toISOString() || null,
    }));

    return NextResponse.json({
      items: sanitizedItems,
      total,
      limit,
      offset,
    });
  } catch (err: unknown) {
    return handleAuthError(err);
  }
}
