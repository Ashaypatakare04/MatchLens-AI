import { NextRequest, NextResponse } from "next/server";
import { Store } from "@/lib/storage/store";
import { requireAuthenticatedUser, handleAuthError } from "@/lib/auth/session";
import { getObjectStorageService } from "@/lib/storage/object-storage";

/**
 * GET /api/jobs/[id]/candidates/[candidateId]/document
 * 
 * Verifies tenant ownership and role authorization, retrieves the resume document record,
 * and generates a short-lived (5-minute) signed download URL.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; candidateId: string }> }
) {
  try {
    const user = await requireAuthenticatedUser(req);
    const { id: jobId, candidateId } = await params;

    // Verify parent job belongs to user's organization
    const job = await Store.getJob(user.organizationId, jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Verify candidate belongs to user's organization and job
    const candidate = await Store.getCandidate(user.organizationId, candidateId);
    if (!candidate || candidate.jobId !== jobId) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    // Query resume document record
    const document = await Store.getResumeDocumentByCandidate(user.organizationId, candidateId);
    if (!document || document.status === "purged") {
      return NextResponse.json(
        { error: "Resume document not found or has been purged per retention policy" },
        { status: 404 }
      );
    }

    const storage = getObjectStorageService();

    // Generate short-lived signed URL (300 seconds = 5 minutes)
    const downloadUrl = await storage.createShortLivedDownloadUrl(
      document.storageKey,
      user.organizationId,
      300,
      document.fileName
    );

    return NextResponse.json({
      documentId: document.id,
      fileName: document.fileName,
      fileType: document.fileType,
      fileSize: document.fileSize,
      mimeType: document.mimeType,
      status: document.status,
      downloadUrl,
      expiresInSeconds: 300,
    });
  } catch (err: unknown) {
    return handleAuthError(err);
  }
}
