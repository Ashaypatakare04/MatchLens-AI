/**
 * MatchLens AI - Asynchronous Processing Queue Types
 * 
 * Defines queue payloads, lifecycle statuses, stages, and worker configurations.
 * Security Guarantee: Queue payloads contain ONLY stable identifiers (IDs, keys, hashes).
 * Never include sensitive resume text, passwords, session tokens, or credentials.
 */

export type ProcessingJobStatus =
  | "QUEUED"
  | "PROCESSING"
  | "COMPLETED"
  | "PARTIALLY_FAILED"
  | "FAILED"
  | "CANCELLED";

export type ProcessingStage =
  | "queued"
  | "extracting"
  | "normalizing"
  | "matching"
  | "completed"
  | "failed";

export interface QueueJobPayload {
  processingJobId: string;
  organizationId: string;
  jobId: string;
  documentId: string;
  storageKey: string;
  fileName: string;
  fileHash: string;
}

export interface ProcessingJobProgress {
  processingJobId: string;
  stage: ProcessingStage;
  progressPercent: number; // 0 to 100
  message?: string;
}

export interface ProcessingJobResult {
  processingJobId: string;
  status: "COMPLETED" | "PARTIALLY_FAILED" | "FAILED";
  candidateId?: string;
  candidateName?: string;
  overallScore?: number;
  warnings?: string[];
  errorCode?: string;
  errorMessage?: string;
}

export interface WorkerOptions {
  concurrency?: number;
  pollIntervalMs?: number;
  maxAttempts?: number;
  staleHeartbeatTimeoutMs?: number; // e.g. 5 minutes before worker crash is assumed
}
