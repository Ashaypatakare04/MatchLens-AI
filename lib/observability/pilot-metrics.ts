/**
 * MatchLens AI - Pilot Usage & Workflow Telemetry Engine
 * 
 * Provides privacy-preserving, organization-scoped telemetry and metrics
 * for the 5-recruiter validation pilot.
 * 
 * Strict Telemetry Principles:
 * 1. Zero PII: Never logs raw resumes, candidate contact details, tokens, or private signed URLs.
 * 2. Organization Scoped: Every query is bounded by organizationId with cascade integrity.
 * 3. Defensible Definitions: Every metric specifies explicit start event, end event, unit, and aggregation.
 * 4. Ground-Truth Separation: Distinguishes system predictions from recruiter judgments and observed facts.
 */

import { getDb } from "../db";
import {
  processingJobs,
  auditEvents,
  pilotFeedback,
  analyses,
  jobs,
  candidates,
} from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { AuditLogger, AuditEventType } from "../engine/audit-logger";
import type { UserRole } from "../auth/session";

export interface MetricDefinition {
  name: string;
  description: string;
  startEvent: string;
  endEvent: string;
  unit: string;
  aggregation: "mean" | "median" | "ratio_percent" | "count" | "p95";
}

export const PILOT_METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  time_upload_to_completion: {
    name: "Time from Upload Acceptance to Processing Completion",
    description: "Measures asynchronous latency from HTTP 202 receipt to terminal analysis ready.",
    startEvent: "processing_jobs.created_at (HTTP 202 accepted)",
    endEvent: "processing_jobs.completed_at (stage: matching completed)",
    unit: "milliseconds",
    aggregation: "mean",
  },
  processing_failure_rate: {
    name: "Processing Failure Rate",
    description: "Ratio of failed ingestion/analysis jobs over total queued jobs.",
    startEvent: "processing_jobs enqueue",
    endEvent: "processing_jobs status = FAILED",
    unit: "percentage",
    aggregation: "ratio_percent",
  },
  time_to_complete_shortlist: {
    name: "Time Required to Complete a Shortlist",
    description: "Recruiter elapsed working time between candidate batch ready and first shortlisted candidate.",
    startEvent: "MIN(processing_jobs.completed_at) for job requisition",
    endEvent: "MIN(audit_events.timestamp) where newState = 'shortlisted'",
    unit: "minutes",
    aggregation: "median",
  },
  candidates_inspected_before_shortlist: {
    name: "Candidates Inspected Before Shortlist",
    description: "Count of distinct candidate profiles viewed by recruiter before shortlisting first candidate.",
    startEvent: "audit_events candidate_detail_inspected",
    endEvent: "audit_events candidate_decision_changed (shortlisted)",
    unit: "candidates count",
    aggregation: "count",
  },
  evidence_views_and_comparisons: {
    name: "Evidence Views and Candidate Comparisons",
    description: "Recruiter engagement with defensibility features (evidence logs, side-by-side comparisons).",
    startEvent: "evidence_inspected or candidate_compared event",
    endEvent: "user navigates away / interaction logged",
    unit: "interactions count",
    aggregation: "count",
  },
  recruiter_decision_completion: {
    name: "Recruiter Decision Completion",
    description: "Percentage of ingested candidates who received an explicit hiring decision.",
    startEvent: "Candidate ingestion completed",
    endEvent: "recruiterDecision in ('shortlisted', 'maybe', 'rejected', 'needs_verification')",
    unit: "percentage",
    aggregation: "ratio_percent",
  },
  ranking_disagreements: {
    name: "Ranking Disagreements Recorded",
    description: "Instances where recruiter flagged candidate position as incorrect or promoted/demoted against score.",
    startEvent: "Candidate inspection in ranking list",
    endEvent: "pilot_feedback with category 'relevant_ranked_too_low' or 'irrelevant_ranked_too_high'",
    unit: "disagreements count",
    aggregation: "count",
  },
  user_reported_trust_and_usefulness: {
    name: "User-Reported Trust and Usefulness",
    description: "Subjective Likert rating (1.0 to 5.0) reported by recruiter during evaluation.",
    startEvent: "Recruiter reviews match explanation & evidence",
    endEvent: "Feedback submission rating 1-5",
    unit: "scale (1.0 - 5.0)",
    aggregation: "mean",
  },
  repeat_usage_during_pilot: {
    name: "Repeat Usage During Pilot",
    description: "Measures sustained engagement across distinct evaluation sessions and job requisitions.",
    startEvent: "First job created by recruiter",
    endEvent: "Subsequent active evaluation days / batches",
    unit: "active days / requisitions",
    aggregation: "count",
  },
};

export interface PilotMetricsSummary {
  organizationId: string;
  generatedAt: string;
  processing: {
    totalJobsQueued: number;
    totalJobsCompleted: number;
    totalJobsFailed: number;
    failureRatePercent: number;
    averageProcessingDurationMs: number | null;
  };
  workflow: {
    totalRequisitions: number;
    totalCandidates: number;
    totalReviewedCandidates: number;
    decisionCompletionRatePercent: number;
    shortlistedCount: number;
    maybeCount: number;
    rejectedCount: number;
    evidenceViewsCount: number;
    comparisonsCount: number;
    medianTimeToShortlistMinutes: number | null;
  };
  validationFeedback: {
    totalFeedbackEntries: number;
    rankingDisagreementsCount: number;
    averageTrustScore: number | null;
    averageUsefulnessScore: number | null;
    totalReportedTimeSavedMinutes: number;
    disagreementReasonsBreakdown: Record<string, number>;
  };
  metricDefinitions: Record<string, MetricDefinition>;
}

/**
 * Records a privacy-conscious telemetry event. Never logs PII.
 */
export async function recordPilotTelemetry(
  organizationId: string,
  eventType: AuditEventType,
  jobId: string,
  actor: { userId: string; userName: string; role: UserRole },
  metadata?: Record<string, unknown>,
  candidateId?: string
): Promise<void> {
  // Scrub any accidental raw text or tokens from metadata
  const sanitizedMeta: Record<string, unknown> = {};
  if (metadata) {
    for (const [key, val] of Object.entries(metadata)) {
      if (
        key.toLowerCase().includes("token") ||
        key.toLowerCase().includes("secret") ||
        key.toLowerCase().includes("url") ||
        key.toLowerCase().includes("resume") ||
        key.toLowerCase().includes("text")
      ) {
        continue;
      }
      sanitizedMeta[key] = val;
    }
  }

  await AuditLogger.recordEvent(organizationId, {
    eventType,
    jobId,
    candidateId,
    actor,
    metadata: sanitizedMeta,
  });
}

/**
 * Aggregates all Phase 2 product metrics for an organization.
 * Strictly tenant-isolated.
 */
export async function getPilotOrganizationMetrics(
  organizationId: string
): Promise<PilotMetricsSummary> {
  const db = await getDb();
  const now = new Date();

  // 1. Processing metrics (bounded by orgId)
  const pJobRows = await db
    .select({
      id: processingJobs.id,
      status: processingJobs.status,
      startedAt: processingJobs.startedAt,
      completedAt: processingJobs.completedAt,
    })
    .from(processingJobs)
    .where(eq(processingJobs.organizationId, organizationId));

  const totalJobsQueued = pJobRows.length;
  const completedJobs = pJobRows.filter((j) => j.status === "COMPLETED");
  const failedJobs = pJobRows.filter((j) => j.status === "FAILED");
  const failureRatePercent = totalJobsQueued > 0
    ? Math.round((failedJobs.length / totalJobsQueued) * 1000) / 10
    : 0;

  let totalDurationMs = 0;
  let durationCount = 0;
  for (const j of completedJobs) {
    if (j.completedAt && j.startedAt) {
      totalDurationMs += new Date(j.completedAt).getTime() - new Date(j.startedAt).getTime();
      durationCount++;
    }
  }
  const averageProcessingDurationMs = durationCount > 0
    ? Math.round(totalDurationMs / durationCount)
    : null;

  // 2. Workflow metrics
  const jobRows = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(eq(jobs.organizationId, organizationId));
  const totalRequisitions = jobRows.length;

  const candidateRows = await db
    .select({ id: candidates.id, jobId: candidates.jobId })
    .from(candidates)
    .where(eq(candidates.organizationId, organizationId));
  const totalCandidates = candidateRows.length;

  const analysisRows = await db
    .select({
      id: analyses.id,
      recruiterDecision: analyses.recruiterDecision,
      jobId: analyses.jobId,
      decisionTimestamp: analyses.decisionTimestamp,
    })
    .from(analyses)
    .innerJoin(candidates, eq(analyses.candidateId, candidates.id))
    .where(eq(candidates.organizationId, organizationId));

  const shortlistedCount = analysisRows.filter((a) => a.recruiterDecision === "shortlisted").length;
  const maybeCount = analysisRows.filter((a) => a.recruiterDecision === "maybe").length;
  const rejectedCount = analysisRows.filter((a) => a.recruiterDecision === "rejected").length;
  const reviewedCount = shortlistedCount + maybeCount + rejectedCount;
  const decisionCompletionRatePercent = totalCandidates > 0
    ? Math.round((reviewedCount / totalCandidates) * 1000) / 10
    : 0;

  // 3. Telemetry event counts (evidence views, comparisons)
  const [evidenceViewsRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.organizationId, organizationId),
        eq(auditEvents.eventType, "evidence_inspected")
      )
    );
  const evidenceViewsCount = Number(evidenceViewsRow?.count || 0);

  const [comparisonsRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.organizationId, organizationId),
        eq(auditEvents.eventType, "candidate_compared")
      )
    );
  const comparisonsCount = Number(comparisonsRow?.count || 0);

  // 4. Time to shortlist calculation (approximate median minutes across jobs with shortlists)
  const jobShortlistTimes: number[] = [];
  for (const job of jobRows) {
    const jobPJobs = pJobRows.filter((pj) => pj.completedAt);
    const jobAnalyses = analysisRows.filter(
      (a) => a.jobId === job.id && a.recruiterDecision === "shortlisted" && a.decisionTimestamp
    );

    if (jobPJobs.length > 0 && jobAnalyses.length > 0) {
      // Sort earliest processing completion and earliest shortlist decision
      const earliestBatchDone = Math.min(...jobPJobs.map((p) => new Date(p.completedAt!).getTime()));
      const earliestShortlist = Math.min(
        ...jobAnalyses.map((a) => new Date(a.decisionTimestamp!).getTime())
      );
      if (earliestShortlist > earliestBatchDone) {
        const diffMinutes = Math.round((earliestShortlist - earliestBatchDone) / (1000 * 60));
        jobShortlistTimes.push(diffMinutes);
      }
    }
  }

  jobShortlistTimes.sort((a, b) => a - b);
  const medianTimeToShortlistMinutes =
    jobShortlistTimes.length > 0
      ? jobShortlistTimes[Math.floor(jobShortlistTimes.length / 2)]
      : null;

  // 5. Validation Feedback metrics
  const fbRows = await db
    .select()
    .from(pilotFeedback)
    .where(eq(pilotFeedback.organizationId, organizationId));

  const totalFeedbackEntries = fbRows.length;
  const disagreementRows = fbRows.filter(
    (f) =>
      f.category === "relevant_ranked_too_low" ||
      f.category === "irrelevant_ranked_too_high" ||
      Boolean(f.disagreementReason)
  );
  const rankingDisagreementsCount = disagreementRows.length;

  const disagreementReasonsBreakdown: Record<string, number> = {};
  for (const f of disagreementRows) {
    if (f.disagreementReason) {
      disagreementReasonsBreakdown[f.disagreementReason] =
        (disagreementReasonsBreakdown[f.disagreementReason] || 0) + 1;
    }
  }

  let totalTrust = 0;
  let trustCount = 0;
  let totalUsefulness = 0;
  let usefulnessCount = 0;
  let totalReportedTimeSavedMinutes = 0;

  for (const f of fbRows) {
    if (typeof f.perceivedTrustScore === "number") {
      totalTrust += f.perceivedTrustScore;
      trustCount++;
    }
    if (typeof f.perceivedUsefulnessScore === "number") {
      totalUsefulness += f.perceivedUsefulnessScore;
      usefulnessCount++;
    }
    if (typeof f.timeSavedMinutes === "number") {
      totalReportedTimeSavedMinutes += f.timeSavedMinutes;
    }
  }

  const averageTrustScore = trustCount > 0 ? Math.round((totalTrust / trustCount) * 10) / 10 : null;
  const averageUsefulnessScore =
    usefulnessCount > 0 ? Math.round((totalUsefulness / usefulnessCount) * 10) / 10 : null;

  return {
    organizationId,
    generatedAt: now.toISOString(),
    processing: {
      totalJobsQueued,
      totalJobsCompleted: completedJobs.length,
      totalJobsFailed: failedJobs.length,
      failureRatePercent,
      averageProcessingDurationMs,
    },
    workflow: {
      totalRequisitions,
      totalCandidates,
      totalReviewedCandidates: reviewedCount,
      decisionCompletionRatePercent,
      shortlistedCount,
      maybeCount,
      rejectedCount,
      evidenceViewsCount,
      comparisonsCount,
      medianTimeToShortlistMinutes,
    },
    validationFeedback: {
      totalFeedbackEntries,
      rankingDisagreementsCount,
      averageTrustScore,
      averageUsefulnessScore,
      totalReportedTimeSavedMinutes,
      disagreementReasonsBreakdown,
    },
    metricDefinitions: PILOT_METRIC_DEFINITIONS,
  };
}
