import { NextRequest, NextResponse } from "next/server";
import { Store } from "@/lib/storage/store";
import { requireAuthenticatedUser, handleAuthError } from "@/lib/auth/session";

/**
 * GET /api/processing-jobs/[id]
 * 
 * Retrieves status, stage, progress, and safe failure info for a single processing job.
 * Enforces organization ownership. Non-owner access returns non-disclosing 404.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser(req);
    const { id } = await params;

    const pJob = await Store.getProcessingJob(user.organizationId, id);
    if (!pJob) {
      return NextResponse.json({ error: "Processing job not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: pJob.id,
      jobId: pJob.jobId,
      documentId: pJob.documentId,
      candidateId: pJob.candidateId,
      fileName: pJob.fileName,
      fileSize: pJob.fileSize,
      status: pJob.status,
      currentStage: pJob.currentStage,
      progress: pJob.progress,
      attempts: pJob.attempts,
      maxAttempts: pJob.maxAttempts,
      errorCode: pJob.errorCode,
      errorMessage: pJob.errorMessage,
      createdAt: pJob.createdAt.toISOString(),
      startedAt: pJob.startedAt?.toISOString() || null,
      completedAt: pJob.completedAt?.toISOString() || null,
    });
  } catch (err: unknown) {
    return handleAuthError(err);
  }
}
