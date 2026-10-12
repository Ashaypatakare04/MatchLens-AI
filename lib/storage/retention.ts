/**
 * MatchLens AI - Data Retention & GDPR Compliance Engine
 * 
 * Manages automated expiration, retention enforcement, and cryptographic
 * purging of candidate resumes and personally identifiable documents.
 */

import { Store } from "./store";

export interface RetentionPolicyConfig {
  defaultRetentionDays: number;
}

export function getDefaultRetentionDays(): number {
  const envVal = process.env.RESUME_RETENTION_DAYS;
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 180; // 180 days default
}

export function computeRetentionExpiresAt(days: number = getDefaultRetentionDays()): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export interface RetentionPruneResult {
  totalExpired: number;
  successfullyPurged: number;
  failedPurges: number;
  purgedDocumentIds: string[];
}

/**
 * Runs a retention sweep: identifies all expired resume documents and
 * permanently deletes them from private object storage, marking records as purged.
 */
export async function executeRetentionPrune(
  batchLimit: number = 100
): Promise<RetentionPruneResult> {
  const expiredDocs = await Store.getExpiredDocuments(batchLimit);

  const result: RetentionPruneResult = {
    totalExpired: expiredDocs.length,
    successfullyPurged: 0,
    failedPurges: 0,
    purgedDocumentIds: [],
  };

  for (const doc of expiredDocs) {
    try {
      const purged = await Store.purgeExpiredDocument(doc);
      if (purged) {
        result.successfullyPurged++;
        result.purgedDocumentIds.push(doc.id);
      } else {
        result.failedPurges++;
      }
    } catch (err) {
      console.error(`Failed to prune expired document ${doc.id}:`, err);
      result.failedPurges++;
    }
  }

  return result;
}
