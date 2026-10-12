import crypto from "crypto";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { Store } from "@/lib/storage/store";
import { sanitizeFilename } from "@/lib/security/input-guard";
import { requireOrganizationRole, handleAuthError } from "@/lib/auth/session";
import { getObjectStorageService, generateResumeStorageKey } from "@/lib/storage/object-storage";
import { processResumeJob } from "@/lib/queue/processor";
import { QueueJobPayload } from "@/lib/queue/types";
import { extractOrGenerateRequestId, logger } from "@/lib/logger";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = new Set(["pdf", "docx", "txt"]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { requestId } = extractOrGenerateRequestId(req);
  try {
    const user = await requireOrganizationRole(req, ["ADMIN", "RECRUITER"]);
    const { id: jobId } = await params;

    // Verify target job belongs to user's organization
    const job = await Store.getJob(user.organizationId, jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404, headers: { "x-request-id": requestId } });
    }

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
    }

    if (files.length > 50) {
      return NextResponse.json(
        { error: "Maximum batch upload limit of 50 resumes exceeded." },
        { status: 400 }
      );
    }

    const isSync = req.nextUrl.searchParams.get("sync") === "true";
    const storage = getObjectStorageService();

    // Fetch existing candidates and documents to detect duplicates
    const [existingCandidates, existingDocs] = await Promise.all([
      Store.getCandidates(user.organizationId, jobId),
      Store.getResumeDocumentsByJob(user.organizationId, jobId),
    ]);
    const existingHashes = new Set([
      ...existingCandidates.map((c) => c.fileHash),
      ...existingDocs.filter((d) => d.status !== "purged").map((d) => d.fileHash),
    ]);

    const results: Array<{
      fileName: string;
      status: "queued" | "duplicate" | "error" | "success";
      processingJobId?: string;
      documentId?: string;
      candidateId?: string;
      candidateName?: string;
      overallScore?: number;
      errorReason?: string;
      warnings?: string[];
    }> = [];

    const retentionDays = parseInt(process.env.RESUME_RETENTION_DAYS || "180", 10);
    const retentionExpiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);

    for (const file of files) {
      const fileName = sanitizeFilename(file.name || "uploaded_resume.txt");
      const ext = path.extname(fileName).replace(".", "").toLowerCase() || "pdf";

      if (!ALLOWED_EXTENSIONS.has(ext)) {
        results.push({
          fileName,
          status: "error",
          errorReason: `Unsupported file format ".${ext}". Supported formats: PDF, DOCX, TXT.`,
        });
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        results.push({
          fileName,
          status: "error",
          errorReason: `File exceeds maximum allowed size of 10MB (${(file.size / 1024 / 1024).toFixed(1)}MB).`,
        });
        continue;
      }

      let buffer: Buffer;
      try {
        const arrayBuffer = await file.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      } catch {
        results.push({
          fileName,
          status: "error",
          errorReason: "Failed to read uploaded file buffer.",
        });
        continue;
      }

      const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");

      // Check for duplicate resume within this job
      if (existingHashes.has(fileHash)) {
        results.push({
          fileName,
          status: "duplicate",
          errorReason: "Duplicate resume detected (cryptographic SHA-256 match). Already analyzed for this job.",
        });
        continue;
      }

      // Generate server-controlled IDs
      const docId = `doc-${crypto.randomBytes(8).toString("hex")}`;
      const pjobId = `pjob-${crypto.randomBytes(8).toString("hex")}`;
      const storageKey = generateResumeStorageKey(user.organizationId, jobId, docId, ext);
      const idempotencyKey = `upload-${jobId}-${fileHash}`;

      const mimeType =
        file.type ||
        (ext === "pdf"
          ? "application/pdf"
          : ext === "docx"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "text/plain");

      let uploadedStorageKey: string | null = null;
      try {
        // 1. Put file in private object storage
        await storage.putPrivateObject(storageKey, buffer, {
          organizationId: user.organizationId,
          contentType: mimeType,
          metadata: {
            originalFileName: fileName,
            fileHash,
            jobId,
          },
        });
        uploadedStorageKey = storageKey;

        // 2. Persist resume document metadata record
        await Store.saveResumeDocument(user.organizationId, {
          id: docId,
          jobId,
          storageKey,
          storageProvider: process.env.S3_BUCKET_NAME ? "s3" : "local",
          fileName,
          fileType: ext,
          mimeType,
          fileSize: buffer.length,
          fileHash,
          status: "processing",
          retentionExpiresAt,
        });

        // 3. Atomically persist processing job and transactional outbox event
        const { processingJob } = await Store.createProcessingJobWithOutbox(user.organizationId, {
          id: pjobId,
          jobId,
          documentId: docId,
          fileName,
          fileSize: buffer.length,
          fileHash,
          storageKey,
          idempotencyKey,
        });

        existingHashes.add(fileHash);

        if (isSync) {
          // Synchronous processing fallback (used by test suites / explicit caller)
          const queuePayload: QueueJobPayload = {
            processingJobId: pjobId,
            organizationId: user.organizationId,
            jobId,
            documentId: docId,
            storageKey,
            fileName,
            fileHash,
          };
          const processResult = await processResumeJob(queuePayload);
          results.push({
            fileName,
            status: processResult.status === "FAILED" ? "error" : "success",
            processingJobId: pjobId,
            documentId: docId,
            candidateId: processResult.candidateId,
            candidateName: processResult.candidateName,
            overallScore: processResult.overallScore,
            warnings: processResult.warnings,
            errorReason: processResult.errorMessage,
          });
        } else {
          // Standard asynchronous queue response
          results.push({
            fileName,
            status: "queued",
            processingJobId: processingJob.id,
            documentId: docId,
          });
        }
      } catch (uploadOrDbErr: unknown) {
        // Compensating transaction: Clean up storage object if persistence failed
        if (uploadedStorageKey) {
          try {
            await storage.deletePrivateObject(uploadedStorageKey, user.organizationId);
          } catch (cleanupErr) {
            console.error(`Compensating storage cleanup failed for ${uploadedStorageKey}:`, cleanupErr);
          }
        }

        const msg = uploadOrDbErr instanceof Error ? uploadOrDbErr.message : String(uploadOrDbErr);
        results.push({
          fileName,
          status: "error",
          errorReason: msg,
        });
      }
    }

    const processedCount = results.filter((r) => r.status === "success").length;
    const queuedCount = results.filter((r) => r.status === "queued").length;
    const errorCount = results.filter((r) => r.status === "error").length;

    logger.info(`Resume batch upload processed (accepted: ${queuedCount}, sync: ${processedCount}, errors: ${errorCount})`, {
      event: "upload.batch_processed",
      component: "upload_api",
      requestId,
      orgId: user.organizationId,
      jobId,
      totalFiles: files.length,
      queuedCount,
      processedCount,
      errorCount,
      isSync,
    });

    const responseStatus = isSync ? 200 : 202;

    return NextResponse.json(
      {
        total: files.length,
        processed: isSync ? processedCount : queuedCount,
        accepted: queuedCount,
        isAsync: !isSync,
        results,
      },
      {
        status: responseStatus,
        headers: {
          "x-request-id": requestId,
        },
      }
    );
  } catch (err: unknown) {
    return handleAuthError(err);
  }
}
