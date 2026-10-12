/**
 * MatchLens AI - Core Resume Processing Engine
 * 
 * Executes asynchronous extraction, normalization, and scoring of uploaded candidate resumes.
 * Designed to be runtime-agnostic: callable by BullMQ workers, transactional outbox pollers,
 * or scheduled cloud functions.
 * 
 * Strict Guarantees:
 * 1. Derives and validates tenant isolation across Organization, Job, and Document.
 * 2. Never trusts unverified client metadata.
 * 3. Never writes raw resume text to queue messages or logs.
 * 4. Deterministic scoring algorithms, evidence classification, and hierarchy preserved intact.
 * 5. Idempotent: safe against duplicate deliveries and worker retries.
 */

import { Store } from "../storage/store";
import { getObjectStorageService } from "../storage/object-storage";
import { extractDocumentFromBuffer } from "../parsers/document-extractor";
import { extractCandidateProfileFromText } from "../extractor/resume-extractor";
import { analyzeCandidate } from "../engine/analyzer";
import { AuditLogger } from "../engine/audit-logger";
import { QueueJobPayload, ProcessingJobResult } from "./types";
import { logger } from "../logger";

export class PermanentProcessingError extends Error {
  public readonly code: string;
  constructor(message: string, code: string = "INVALID_DOCUMENT") {
    super(message);
    this.name = "PermanentProcessingError";
    this.code = code;
  }
}

export class TransientProcessingError extends Error {
  public readonly code: string;
  constructor(message: string, code: string = "TRANSIENT_FAILURE") {
    super(message);
    this.name = "TransientProcessingError";
    this.code = code;
  }
}

/**
 * Processes a single resume processing job through the entire MatchLens evaluation pipeline.
 */
export async function processResumeJob(
  payload: QueueJobPayload
): Promise<ProcessingJobResult> {
  const { processingJobId, organizationId, jobId, documentId } = payload;

  try {
    // 1. Verify Parent Job and Tenant Ownership
    const job = await Store.getJob(organizationId, jobId);
    if (!job) {
      throw new PermanentProcessingError(
        `Job requisition ${jobId} not found or access denied for organization ${organizationId}.`,
        "JOB_NOT_FOUND"
      );
    }

    // 2. Verify Resume Document Record and Retention Status
    const docRecord = await Store.getResumeDocument(organizationId, documentId);
    if (!docRecord) {
      throw new PermanentProcessingError(
        `Resume document ${documentId} not found or access denied for organization ${organizationId}.`,
        "DOCUMENT_NOT_FOUND"
      );
    }

    if (docRecord.status === "purged") {
      throw new PermanentProcessingError(
        `Resume document ${documentId} has been purged per retention/compliance policy. Cannot process.`,
        "DOCUMENT_PURGED"
      );
    }

    // 3. Stage 1: Document Extraction
    logger.info(`Starting resume extraction for job ${processingJobId}`, {
      event: "processing.stage_extracting",
      component: "processor",
      processingJobId,
      orgId: organizationId,
      jobId,
      documentId,
      stage: "extracting",
    });

    await Store.updateProcessingJobProgress(processingJobId, {
      stage: "extracting",
      progress: 25,
      heartbeat: true,
    });

    const storage = getObjectStorageService();
    const objectResult = await storage.getPrivateObject(docRecord.storageKey, organizationId);
    if (!objectResult) {
      throw new TransientProcessingError(
        `Unable to retrieve file from storage for key ${docRecord.storageKey}.`,
        "STORAGE_UNAVAILABLE"
      );
    }

    const docResult = await extractDocumentFromBuffer(objectResult.data, docRecord.fileName);

    // 4. Stage 2: Normalization & Candidate Profile Extraction
    logger.info(`Extracting profile for job ${processingJobId}`, {
      event: "processing.stage_normalizing",
      component: "processor",
      processingJobId,
      orgId: organizationId,
      jobId,
      stage: "normalizing",
    });

    await Store.updateProcessingJobProgress(processingJobId, {
      stage: "normalizing",
      progress: 50,
      heartbeat: true,
    });

    // Check for existing duplicate candidate for this job
    const existingCandidates = await Store.getCandidates(organizationId, jobId);
    const existingCandidate = existingCandidates.find((c) => c.fileHash === docResult.fileHash);

    let candidateProfile;
    if (existingCandidate) {
      // Idempotency: reuse existing candidate profile instead of duplicating
      candidateProfile = existingCandidate;
    } else {
      candidateProfile = extractCandidateProfileFromText(
        docResult.text,
        docRecord.fileName,
        docResult.fileType,
        docResult.fileSize,
        docResult.fileHash
      );
      candidateProfile.jobId = jobId;
      candidateProfile.parsingConfidence = docResult.confidence;
      candidateProfile.parsingWarnings.push(...docResult.warnings);
    }

    // 5. Stage 3: Deterministic Candidate Matching & Evidence Scoring
    logger.info(`Running deterministic match for job ${processingJobId}`, {
      event: "processing.stage_matching",
      component: "processor",
      processingJobId,
      orgId: organizationId,
      jobId,
      stage: "matching",
    });

    await Store.updateProcessingJobProgress(processingJobId, {
      stage: "matching",
      progress: 75,
      heartbeat: true,
    });

    // Re-verify job wasn't deleted while extracting
    const freshJob = await Store.getJob(organizationId, jobId);
    if (!freshJob) {
      throw new PermanentProcessingError(
        "Parent job requisition was deleted during processing.",
        "JOB_DELETED"
      );
    }

    const match = analyzeCandidate(candidateProfile, freshJob, freshJob.weights);

    // 6. Persistence: Transactional Save
    await Store.saveCandidateWithMatch(organizationId, candidateProfile, match);

    // Link candidate ID to document metadata
    await Store.saveResumeDocument(organizationId, {
      ...docRecord,
      candidateId: candidateProfile.id,
      status: "active",
    });

    // 7. Audit Logging
    await AuditLogger.recordEvent(organizationId, {
      eventType: "resume_parsed",
      jobId,
      candidateId: candidateProfile.id,
      actor: {
        userId: "system-async-worker",
        userName: "MatchLens Asynchronous Worker",
        role: "RECRUITER",
      },
      notes: `Asynchronously processed resume "${docRecord.fileName}". Overall score: ${match.overallScore}%. Confidence: ${docResult.confidence}.`,
    });

    const finalStatus =
      docResult.warnings.length > 0 ? "PARTIALLY_FAILED" : "COMPLETED";

    await Store.completeProcessingJob(processingJobId, {
      candidateId: candidateProfile.id,
      status: finalStatus,
      warnings: docResult.warnings,
    });

    return {
      processingJobId,
      status: finalStatus,
      candidateId: candidateProfile.id,
      candidateName: candidateProfile.name,
      overallScore: match.overallScore,
      warnings: docResult.warnings,
    };
  } catch (err: unknown) {
    const isPermanent = err instanceof PermanentProcessingError;
    const errorCode =
      err instanceof PermanentProcessingError || err instanceof TransientProcessingError
        ? err.code
        : "PROCESSING_ERROR";

    const rawMessage = err instanceof Error ? err.message : String(err);
    // Sanitize error message to ensure no secrets or stack traces leak to recruiters
    const safeErrorMessage = isPermanent
      ? rawMessage
      : "A transient processing error occurred while parsing the resume. The job will be retried.";

    logger.error(`Processing failure on job ${processingJobId}: [${errorCode}]`, {
      event: "processing.failed",
      component: "processor",
      processingJobId,
      orgId: organizationId,
      jobId,
      errorCode,
      stage: "failed",
    }, isPermanent ? err : undefined);

    await Store.failProcessingJob(processingJobId, {
      errorCode,
      errorMessage: safeErrorMessage,
      canRetry: !isPermanent,
    });

    return {
      processingJobId,
      status: "FAILED",
      errorCode,
      errorMessage: safeErrorMessage,
    };
  }
}
