/**
 * MatchLens AI - Tenant-Scoped Data Access / Repository Layer (PostgreSQL / Drizzle ORM)
 * 
 * Enforces strict multi-tenant organization isolation across all database operations.
 * Mandatory Rule: Every operation involving organization-owned data requires and validates
 * the authorized organizationId. Cross-tenant access attempts return null / false (non-disclosing).
 */

import { getDb } from "../db";
import {
  jobs,
  candidates,
  analyses,
  resumeDocuments,
  processingJobs,
  processingOutbox,
  pilotFeedback,
  users,
  ResumeDocumentRecord,
  ProcessingJobRecord,
  ProcessingOutboxRecord,
} from "../db/schema";
import { eq, and, desc, asc, lte, sql } from "drizzle-orm";
import { getObjectStorageService } from "./object-storage";
import type { QueueJobPayload } from "../queue/types";
import {
  Job,
  ExtractedJobRequirements,
  CandidateProfile,
  CandidateWithMatch,
  MatchAnalysis,
  ScoringWeights,
  RecruiterDecision,
  PipelineStage,
  RecruiterFeedback,
  PilotFeedbackCategory,
  PilotDisagreementReason,
  PilotFeedbackEntry,
  JobEvaluationReport,
} from "../types";
import { analyzeCandidate } from "../engine/analyzer";
import { AuditLogger } from "../engine/audit-logger";
import { seedDemoData, DEMO_ORG_ID } from "../db/seed";
import type { UserRole } from "../auth/session";

function mapJobRow(r: typeof jobs.$inferSelect): Job {
  return {
    id: r.id,
    title: r.title,
    company: r.company,
    location: r.location,
    workMode: r.workMode as Job["workMode"],
    employmentType: r.employmentType as Job["employmentType"],
    rawDescription: r.rawDescription,
    requirements: r.requirements as ExtractedJobRequirements,
    weights: r.weights as ScoringWeights,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function mapCandidateRow(r: typeof candidates.$inferSelect): CandidateProfile {
  return {
    id: r.id,
    jobId: r.jobId,
    name: r.name,
    email: r.email,
    phone: r.phone,
    location: r.location,
    education: r.education as CandidateProfile["education"],
    totalExperienceYears: r.totalExperienceYears,
    statedExperienceYears: r.statedExperienceYears ?? undefined,
    workHistory: r.workHistory as CandidateProfile["workHistory"],
    skills: r.skills as string[],
    certifications: r.certifications as CandidateProfile["certifications"],
    projects: r.projects as CandidateProfile["projects"],
    achievements: r.achievements as string[],
    rawResumeText: r.rawResumeText,
    fileName: r.fileName,
    fileType: r.fileType as CandidateProfile["fileType"],
    fileSize: r.fileSize,
    fileHash: r.fileHash,
    parsingConfidence: r.parsingConfidence as CandidateProfile["parsingConfidence"],
    parsingWarnings: r.parsingWarnings as string[],
    extractedAt: r.extractedAt.toISOString(),
  };
}

function mapAnalysisRow(r: typeof analyses.$inferSelect): MatchAnalysis {
  return {
    candidateId: r.candidateId,
    jobId: r.jobId,
    overallScore: r.overallScore,
    scoreBreakdown: r.scoreBreakdown,
    weightedContributions: r.weightedContributions,
    skillsAnalysis: r.skillsAnalysis as MatchAnalysis["skillsAnalysis"],
    experienceAnalysis: r.experienceAnalysis as MatchAnalysis["experienceAnalysis"],
    educationAnalysis: r.educationAnalysis as MatchAnalysis["educationAnalysis"],
    projectAnalysis: r.projectAnalysis as MatchAnalysis["projectAnalysis"],
    responsibilityAlignment: r.responsibilityAlignment as MatchAnalysis["responsibilityAlignment"],
    requirementMatches: r.requirementMatches as MatchAnalysis["requirementMatches"],
    totalExperienceYears: r.totalExperienceYears ?? undefined,
    relevantExperienceYears: r.relevantExperienceYears ?? undefined,
    matchingEngine: (r.matchingEngine as MatchAnalysis["matchingEngine"]) || "local_semantic",
    strongMatches: r.strongMatches as string[],
    missingRequirements: r.missingRequirements as string[],
    potentialInconsistencies: r.potentialInconsistencies as MatchAnalysis["potentialInconsistencies"],
    evidenceLog: r.evidenceLog as MatchAnalysis["evidenceLog"],
    aiRecommendation: r.aiRecommendation as MatchAnalysis["aiRecommendation"],
    aiExplanation: r.aiExplanation,
    recruiterDecision: r.recruiterDecision as RecruiterDecision,
    recruiterNotes: r.recruiterNotes,
    pipelineStage: (r.pipelineStage as PipelineStage) || "screening",
    recruiterFeedback: (r.recruiterFeedback as RecruiterFeedback) || undefined,
    decisionTimestamp: r.decisionTimestamp?.toISOString(),
    analyzedAt: r.analyzedAt.toISOString(),
  };
}

export const Store = {
  /**
   * Lists jobs owned by the authenticated organization.
   */
  async getJobs(organizationId: string): Promise<Job[]> {
    const db = await getDb();
    const rows = await db
      .select()
      .from(jobs)
      .where(eq(jobs.organizationId, organizationId))
      .orderBy(desc(jobs.createdAt));
    return rows.map(mapJobRow);
  },

  /**
   * Retrieves a job by ID, strictly verifying organization ownership.
   */
  async getJob(organizationId: string, id: string): Promise<Job | null> {
    const db = await getDb();
    const [row] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, id), eq(jobs.organizationId, organizationId)))
      .limit(1);
    return row ? mapJobRow(row) : null;
  },

  /**
   * Creates a new job under the authenticated organization.
   */
  async createJob(
    organizationId: string,
    job: Omit<Job, "createdAt" | "updatedAt"> & Partial<Pick<Job, "createdAt" | "updatedAt">>
  ): Promise<Job> {
    const db = await getDb();
    const now = new Date();
    const jobId = job.id || `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const createdAtStr = job.createdAt || now.toISOString();
    const updatedAtStr = job.updatedAt || now.toISOString();
    await db.insert(jobs).values({
      id: jobId,
      organizationId,
      title: job.title,
      company: job.company,
      location: job.location,
      workMode: job.workMode,
      employmentType: job.employmentType,
      rawDescription: job.rawDescription,
      requirements: job.requirements,
      weights: job.weights,
      version: 1,
      createdAt: new Date(createdAtStr),
      updatedAt: new Date(updatedAtStr),
    });
    return { ...job, id: jobId, createdAt: createdAtStr, updatedAt: updatedAtStr };
  },

  /**
   * Updates a job, verifying organization ownership and optimistic concurrency version.
   */
  async updateJob(
    organizationId: string,
    id: string,
    updates: Partial<Job>,
    expectedVersion?: number
  ): Promise<Job | null> {
    const db = await getDb();
    const [existing] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, id), eq(jobs.organizationId, organizationId)))
      .limit(1);

    if (!existing) return null;

    // Optimistic concurrency check
    if (expectedVersion !== undefined && existing.version !== expectedVersion) {
      throw new Error(
        `Concurrency Conflict: Job was modified by another process (current version: ${existing.version}, expected: ${expectedVersion}).`
      );
    }

    const nextVersion = existing.version + 1;
    const now = new Date();

    const [updated] = await db
      .update(jobs)
      .set({
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.company !== undefined && { company: updates.company }),
        ...(updates.location !== undefined && { location: updates.location }),
        ...(updates.workMode !== undefined && { workMode: updates.workMode }),
        ...(updates.employmentType !== undefined && { employmentType: updates.employmentType }),
        ...(updates.rawDescription !== undefined && { rawDescription: updates.rawDescription }),
        ...(updates.requirements !== undefined && { requirements: updates.requirements }),
        ...(updates.weights !== undefined && { weights: updates.weights }),
        version: nextVersion,
        updatedAt: now,
      })
      .where(and(eq(jobs.id, id), eq(jobs.organizationId, organizationId)))
      .returning();

    return updated ? mapJobRow(updated) : null;
  },

  /**
   * Deletes a job, verifying organization ownership. Cascades to candidates, analyses, and storage objects.
   */
  async deleteJob(organizationId: string, id: string): Promise<boolean> {
    const db = await getDb();
    const [existing] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, id), eq(jobs.organizationId, organizationId)))
      .limit(1);

    if (!existing) return false;

    // Purge associated private resume storage objects before cascading deletion
    try {
      const docs = await db
        .select()
        .from(resumeDocuments)
        .where(
          and(
            eq(resumeDocuments.jobId, id),
            eq(resumeDocuments.organizationId, organizationId)
          )
        );

      const storage = getObjectStorageService();
      for (const doc of docs) {
        try {
          await storage.deletePrivateObject(doc.storageKey, organizationId);
        } catch (storageErr) {
          console.error(`Failed to delete storage object ${doc.storageKey}:`, storageErr);
        }
      }
    } catch (err) {
      console.error(`Error querying resume documents for job deletion:`, err);
    }

    // Foreign key cascading deletes associated candidates & analyses in PostgreSQL
    await db
      .delete(jobs)
      .where(and(eq(jobs.id, id), eq(jobs.organizationId, organizationId)));
    return true;
  },

  /**
   * Retrieves all candidates for a job within the organization.
   */
  async getCandidates(
    organizationId: string,
    jobId: string
  ): Promise<CandidateProfile[]> {
    const db = await getDb();
    // Validate parent job belongs to organization
    const job = await this.getJob(organizationId, jobId);
    if (!job) return [];

    const rows = await db
      .select()
      .from(candidates)
      .where(
        and(
          eq(candidates.jobId, jobId),
          eq(candidates.organizationId, organizationId)
        )
      );
    return rows.map(mapCandidateRow);
  },

  /**
   * Retrieves a candidate by ID, verifying organization ownership.
   */
  async getCandidate(
    organizationId: string,
    candidateId: string
  ): Promise<CandidateProfile | null> {
    const db = await getDb();
    const [row] = await db
      .select()
      .from(candidates)
      .where(
        and(
          eq(candidates.id, candidateId),
          eq(candidates.organizationId, organizationId)
        )
      );
    return row ? mapCandidateRow(row) : null;
  },

  /**
   * Retrieves match analyses for a job within the organization.
   */
  async getMatches(
    organizationId: string,
    jobId: string
  ): Promise<MatchAnalysis[]> {
    const db = await getDb();
    const job = await this.getJob(organizationId, jobId);
    if (!job) return [];

    const rows = await db
      .select({ analysis: analyses })
      .from(analyses)
      .innerJoin(candidates, eq(analyses.candidateId, candidates.id))
      .where(
        and(
          eq(analyses.jobId, jobId),
          eq(candidates.organizationId, organizationId)
        )
      )
      .orderBy(desc(analyses.overallScore));

    return rows.map((r) => mapAnalysisRow(r.analysis));
  },

  /**
   * Retrieves a single match analysis by candidate ID, verifying organization ownership.
   */
  async getMatch(
    organizationId: string,
    candidateId: string
  ): Promise<MatchAnalysis | null> {
    const db = await getDb();
    const [row] = await db
      .select({ analysis: analyses })
      .from(analyses)
      .innerJoin(candidates, eq(analyses.candidateId, candidates.id))
      .where(
        and(
          eq(analyses.candidateId, candidateId),
          eq(candidates.organizationId, organizationId)
        )
      )
      .limit(1);

    return row ? mapAnalysisRow(row.analysis) : null;
  },

  /**
   * Retrieves all candidates for a job paired with their match analysis,
   * sorted by overallScore descending.
   */
  async getCandidatesWithMatches(
    organizationId: string,
    jobId: string
  ): Promise<CandidateWithMatch[]> {
    const candidates = await this.getCandidates(organizationId, jobId);
    const matches = await this.getMatches(organizationId, jobId);
    const matchMap = new Map(matches.map((m) => [m.candidateId, m]));

    return candidates
      .map((cand) => ({
        candidate: cand,
        match: matchMap.get(cand.id)!,
      }))
      .filter((item) => item.match !== undefined)
      .sort((a, b) => b.match.overallScore - a.match.overallScore);
  },

  /**
   * Persists a candidate and match atomically inside a database transaction,
   * verifying parent job organization ownership.
   */
  async saveCandidateWithMatch(
    organizationId: string,
    candidate: CandidateProfile,
    match: MatchAnalysis
  ): Promise<void> {
    const db = await getDb();
    const now = new Date();

    // Verify parent job belongs to this organization
    const job = await this.getJob(organizationId, candidate.jobId);
    if (!job) {
      throw new Error("Cannot save candidate: target job not found in this organization.");
    }

    // Atomic transaction
    await db.transaction(async (tx) => {
      await tx
        .insert(candidates)
        .values({
          id: candidate.id,
          organizationId,
          jobId: candidate.jobId,
          name: candidate.name,
          email: candidate.email,
          phone: candidate.phone,
          location: candidate.location,
          totalExperienceYears: candidate.totalExperienceYears,
          statedExperienceYears: candidate.statedExperienceYears,
          education: candidate.education,
          workHistory: candidate.workHistory,
          skills: candidate.skills,
          certifications: candidate.certifications,
          projects: candidate.projects,
          achievements: candidate.achievements,
          rawResumeText: candidate.rawResumeText,
          fileName: candidate.fileName,
          fileType: candidate.fileType,
          fileSize: candidate.fileSize,
          fileHash: candidate.fileHash,
          parsingConfidence: candidate.parsingConfidence,
          parsingWarnings: candidate.parsingWarnings,
          extractedAt: candidate.extractedAt ? new Date(candidate.extractedAt) : now,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: candidates.id,
          set: {
            organizationId,
            name: candidate.name,
            email: candidate.email,
            phone: candidate.phone,
            location: candidate.location,
            skills: candidate.skills,
            totalExperienceYears: candidate.totalExperienceYears,
            workHistory: candidate.workHistory,
            updatedAt: now,
          },
        });

      await tx
        .insert(analyses)
        .values({
          id: `analysis-${candidate.id}`,
          candidateId: candidate.id,
          jobId: match.jobId,
          overallScore: match.overallScore,
          scoreBreakdown: match.scoreBreakdown,
          weightedContributions: match.weightedContributions,
          skillsAnalysis: match.skillsAnalysis,
          experienceAnalysis: match.experienceAnalysis,
          educationAnalysis: match.educationAnalysis,
          projectAnalysis: match.projectAnalysis,
          responsibilityAlignment: match.responsibilityAlignment,
          requirementMatches: match.requirementMatches,
          totalExperienceYears: match.totalExperienceYears,
          relevantExperienceYears: match.relevantExperienceYears,
          matchingEngine: match.matchingEngine,
          strongMatches: match.strongMatches,
          missingRequirements: match.missingRequirements,
          potentialInconsistencies: match.potentialInconsistencies,
          evidenceLog: match.evidenceLog,
          aiRecommendation: match.aiRecommendation,
          aiExplanation: match.aiExplanation,
          recruiterDecision: match.recruiterDecision || "unreviewed",
          recruiterNotes: match.recruiterNotes || "",
          pipelineStage: match.pipelineStage || "screening",
          recruiterFeedback: match.recruiterFeedback,
          decisionTimestamp: match.decisionTimestamp ? new Date(match.decisionTimestamp) : null,
          analyzedAt: match.analyzedAt ? new Date(match.analyzedAt) : now,
          version: 1,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: analyses.candidateId,
          set: {
            overallScore: match.overallScore,
            scoreBreakdown: match.scoreBreakdown,
            weightedContributions: match.weightedContributions,
            skillsAnalysis: match.skillsAnalysis,
            experienceAnalysis: match.experienceAnalysis,
            educationAnalysis: match.educationAnalysis,
            projectAnalysis: match.projectAnalysis,
            responsibilityAlignment: match.responsibilityAlignment,
            requirementMatches: match.requirementMatches,
            strongMatches: match.strongMatches,
            missingRequirements: match.missingRequirements,
            potentialInconsistencies: match.potentialInconsistencies,
            evidenceLog: match.evidenceLog,
            aiRecommendation: match.aiRecommendation,
            aiExplanation: match.aiExplanation,
            updatedAt: now,
          },
        });
    });
  },

  /**
   * Deletes a candidate, verifying organization ownership, and records audit event.
   */
  async deleteCandidate(
    organizationId: string,
    candidateId: string,
    actor?: { userId: string; userName: string; role: UserRole }
  ): Promise<boolean> {
    const db = await getDb();
    const candidate = await this.getCandidate(organizationId, candidateId);
    if (!candidate) return false;

    const jobId = candidate.jobId;

    // Purge associated private resume storage objects before deleting candidate record
    try {
      const docs = await db
        .select()
        .from(resumeDocuments)
        .where(
          and(
            eq(resumeDocuments.candidateId, candidateId),
            eq(resumeDocuments.organizationId, organizationId)
          )
        );

      const storage = getObjectStorageService();
      for (const doc of docs) {
        try {
          await storage.deletePrivateObject(doc.storageKey, organizationId);
        } catch (storageErr) {
          console.error(`Failed to delete storage object ${doc.storageKey}:`, storageErr);
        }
      }
    } catch (err) {
      console.error(`Error querying resume documents for candidate deletion:`, err);
    }

    await db
      .delete(candidates)
      .where(
        and(
          eq(candidates.id, candidateId),
          eq(candidates.organizationId, organizationId)
        )
      );

    await AuditLogger.recordEvent(organizationId, {
      eventType: "candidate_deleted",
      jobId,
      candidateId,
      actor: actor || {
        userId: "recruiter-default",
        userName: "Primary Recruiter",
        role: "RECRUITER",
      },
      notes: "Candidate PII and match records purged per GDPR / Right-to-Delete compliance request.",
    });

    return true;
  },

  /**
   * Updates recruiter decision, notes, feedback, and pipeline stage,
   * verifying organization ownership.
   */
  async updateRecruiterDecision(
    organizationId: string,
    candidateId: string,
    decision: RecruiterDecision,
    notes?: string,
    feedback?: RecruiterFeedback,
    pipelineStage?: PipelineStage,
    actor?: { userId: string; userName: string; role: UserRole }
  ): Promise<MatchAnalysis | null> {
    const db = await getDb();
    const candidate = await this.getCandidate(organizationId, candidateId);
    if (!candidate) return null;

    const [match] = await db
      .select()
      .from(analyses)
      .where(eq(analyses.candidateId, candidateId))
      .limit(1);

    if (!match) return null;

    const previousDecision = match.recruiterDecision;
    const now = new Date();

    const [updated] = await db
      .update(analyses)
      .set({
        recruiterDecision: decision,
        ...(notes !== undefined && { recruiterNotes: notes }),
        ...(feedback !== undefined && { recruiterFeedback: feedback }),
        ...(pipelineStage !== undefined && { pipelineStage }),
        decisionTimestamp: now,
        version: match.version + 1,
        updatedAt: now,
      })
      .where(eq(analyses.candidateId, candidateId))
      .returning();

    if (!updated) return null;

    const actorUser = actor || {
      userId: feedback?.recruiterId || "recruiter-default",
      userName: "Primary Recruiter",
      role: "RECRUITER",
    };

    await AuditLogger.recordEvent(organizationId, {
      eventType: "candidate_decision_changed",
      jobId: match.jobId,
      candidateId,
      actor: actorUser,
      previousState: previousDecision,
      newState: decision,
      reasonCategory: feedback?.reason,
      notes: notes || match.recruiterNotes,
      metadata: {
        pipelineStage: updated.pipelineStage,
        overrideType: feedback?.overrideType,
        feedbackComment: feedback?.comment,
      },
    });

    if (feedback) {
      await AuditLogger.recordEvent(organizationId, {
        eventType: "recruiter_calibration_feedback",
        jobId: match.jobId,
        candidateId,
        actor: actorUser,
        reasonCategory: feedback.reason,
        notes: feedback.comment || `Recruiter calibration: ${feedback.overrideType}`,
        metadata: {
          overrideType: feedback.overrideType,
          decision,
          overallScore: match.overallScore,
        },
      });
    }

    return mapAnalysisRow(updated);
  },

  /**
   * Rescores candidates for a job within the authenticated organization.
   */
  async rescoreJob(
    organizationId: string,
    jobId: string,
    weights: ScoringWeights,
    actor?: { userId: string; userName: string; role: UserRole }
  ): Promise<MatchAnalysis[]> {
    const db = await getDb();
    const [jobRow] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.organizationId, organizationId)))
      .limit(1);

    if (!jobRow) return [];

    const job = mapJobRow(jobRow);
    const oldWeights = { ...job.weights };
    job.weights = weights;

    await db
      .update(jobs)
      .set({
        weights,
        version: jobRow.version + 1,
        updatedAt: new Date(),
      })
      .where(and(eq(jobs.id, jobId), eq(jobs.organizationId, organizationId)));

    const candProfiles = await this.getCandidates(organizationId, jobId);
    const existingMatches = await this.getMatches(organizationId, jobId);
    const existingMatchesMap = new Map(existingMatches.map((m) => [m.candidateId, m]));

    const updatedMatches: MatchAnalysis[] = [];

    for (const cand of candProfiles) {
      const existing = existingMatchesMap.get(cand.id);
      const newAnalysis = analyzeCandidate(cand, job, weights);

      // Preserve recruiter decisions, notes, and stages
      if (existing) {
        newAnalysis.recruiterDecision = existing.recruiterDecision;
        newAnalysis.recruiterNotes = existing.recruiterNotes;
        newAnalysis.decisionTimestamp = existing.decisionTimestamp;
        newAnalysis.pipelineStage = existing.pipelineStage;
        newAnalysis.recruiterFeedback = existing.recruiterFeedback;
      }

      await this.saveCandidateWithMatch(organizationId, cand, newAnalysis);
      updatedMatches.push(newAnalysis);
    }

    await AuditLogger.recordEvent(organizationId, {
      eventType: "weights_recalculated",
      jobId,
      actor: actor || {
        userId: "recruiter-default",
        userName: "Primary Recruiter",
        role: "RECRUITER",
      },
      metadata: {
        oldWeights,
        newWeights: weights,
        affectedCandidates: candProfiles.length,
      },
    });

    return updatedMatches.sort((a, b) => b.overallScore - a.overallScore);
  },

  /**
   * Updates job requirements and re-evaluates candidates within the organization.
   */
  async updateJobRequirements(
    organizationId: string,
    jobId: string,
    requirements: ExtractedJobRequirements,
    actor?: { userId: string; userName: string; role: UserRole }
  ): Promise<{ job: Job; updatedCount: number } | null> {
    const db = await getDb();
    const [jobRow] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.organizationId, organizationId)))
      .limit(1);

    if (!jobRow) return null;

    const job = mapJobRow(jobRow);
    job.requirements = requirements;

    await db
      .update(jobs)
      .set({
        requirements,
        version: jobRow.version + 1,
        updatedAt: new Date(),
      })
      .where(and(eq(jobs.id, jobId), eq(jobs.organizationId, organizationId)));

    const candProfiles = await this.getCandidates(organizationId, jobId);
    const existingMatches = await this.getMatches(organizationId, jobId);
    const existingMatchesMap = new Map(existingMatches.map((m) => [m.candidateId, m]));

    for (const cand of candProfiles) {
      const existing = existingMatchesMap.get(cand.id);
      const newAnalysis = analyzeCandidate(cand, job, job.weights);
      if (existing) {
        newAnalysis.recruiterDecision = existing.recruiterDecision;
        newAnalysis.recruiterNotes = existing.recruiterNotes;
        newAnalysis.decisionTimestamp = existing.decisionTimestamp;
        newAnalysis.pipelineStage = existing.pipelineStage;
        newAnalysis.recruiterFeedback = existing.recruiterFeedback;
      }
      await this.saveCandidateWithMatch(organizationId, cand, newAnalysis);
    }

    await AuditLogger.recordEvent(organizationId, {
      eventType: "weights_recalculated",
      jobId,
      actor: actor || {
        userId: "recruiter-default",
        userName: "Primary Recruiter",
        role: "RECRUITER",
      },
      notes: `Requisition criteria updated: ${requirements.requiredSkills.length} required skills, ${requirements.minExperienceYears}+ yrs tenure. Re-evaluated ${candProfiles.length} candidates.`,
    });

    return { job, updatedCount: candProfiles.length };
  },

  /**
   * Seeds demo data explicitly into the demo organization.
   */
  async resetDemoData(
    targetOrgId: string = DEMO_ORG_ID
  ): Promise<{ job: Job; candidatesCount: number }> {
    const { jobId, candidateCount } = await seedDemoData();
    const job = await this.getJob(targetOrgId, jobId);
    if (!job) {
      throw new Error("Failed to load demo job after seeding");
    }
    return { job, candidatesCount: candidateCount };
  },

  /**
   * Saves or updates a resume document record under the specified organization.
   */
  async saveResumeDocument(
    organizationId: string,
    doc: {
      id: string;
      jobId: string;
      candidateId?: string;
      storageKey: string;
      storageProvider?: string;
      fileName: string;
      fileType?: string;
      mimeType?: string;
      fileSize?: number;
      fileHash: string;
      status?: string;
      retentionExpiresAt?: Date | null;
    }
  ): Promise<ResumeDocumentRecord> {
    const db = await getDb();
    const now = new Date();

    const [saved] = await db
      .insert(resumeDocuments)
      .values({
        id: doc.id,
        organizationId,
        jobId: doc.jobId,
        candidateId: doc.candidateId,
        storageKey: doc.storageKey,
        storageProvider: doc.storageProvider || "local",
        fileName: doc.fileName,
        fileType: doc.fileType || "pdf",
        mimeType: doc.mimeType || "application/pdf",
        fileSize: doc.fileSize || 0,
        fileHash: doc.fileHash,
        status: doc.status || "active",
        retentionExpiresAt: doc.retentionExpiresAt ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: resumeDocuments.id,
        set: {
          candidateId: doc.candidateId,
          storageKey: doc.storageKey,
          storageProvider: doc.storageProvider || "local",
          status: doc.status || "active",
          retentionExpiresAt: doc.retentionExpiresAt ?? null,
          updatedAt: now,
        },
      })
      .returning();

    return saved;
  },

  /**
   * Retrieves a resume document by ID, enforcing organization ownership.
   */
  async getResumeDocument(
    organizationId: string,
    documentId: string
  ): Promise<ResumeDocumentRecord | null> {
    const db = await getDb();
    const [doc] = await db
      .select()
      .from(resumeDocuments)
      .where(
        and(
          eq(resumeDocuments.id, documentId),
          eq(resumeDocuments.organizationId, organizationId)
        )
      )
      .limit(1);

    return doc || null;
  },

  /**
   * Retrieves the resume document for a candidate, enforcing organization ownership.
   */
  async getResumeDocumentByCandidate(
    organizationId: string,
    candidateId: string
  ): Promise<ResumeDocumentRecord | null> {
    const db = await getDb();
    const [doc] = await db
      .select()
      .from(resumeDocuments)
      .where(
        and(
          eq(resumeDocuments.candidateId, candidateId),
          eq(resumeDocuments.organizationId, organizationId)
        )
      )
      .limit(1);

    return doc || null;
  },

  /**
   * Retrieves all resume documents for a job, enforcing organization ownership.
   */
  async getResumeDocumentsByJob(
    organizationId: string,
    jobId: string
  ): Promise<ResumeDocumentRecord[]> {
    const db = await getDb();
    return db
      .select()
      .from(resumeDocuments)
      .where(
        and(
          eq(resumeDocuments.jobId, jobId),
          eq(resumeDocuments.organizationId, organizationId)
        )
      );
  },

  /**
   * Deletes a resume document record and purges its storage object.
   */
  async deleteResumeDocument(
    organizationId: string,
    documentId: string
  ): Promise<boolean> {
    const db = await getDb();
    const doc = await this.getResumeDocument(organizationId, documentId);
    if (!doc) return false;

    const storage = getObjectStorageService();
    try {
      await storage.deletePrivateObject(doc.storageKey, organizationId);
    } catch (err) {
      console.error(`Failed to delete storage file ${doc.storageKey}:`, err);
    }

    await db
      .delete(resumeDocuments)
      .where(
        and(
          eq(resumeDocuments.id, documentId),
          eq(resumeDocuments.organizationId, organizationId)
        )
      );

    return true;
  },

  /**
   * Queries expired documents across all organizations for retention pruning.
   */
  async getExpiredDocuments(
    limit: number = 100
  ): Promise<ResumeDocumentRecord[]> {
    const db = await getDb();
    const now = new Date();
    return db
      .select()
      .from(resumeDocuments)
      .where(
        and(
          eq(resumeDocuments.status, "active"),
          lte(resumeDocuments.retentionExpiresAt, now)
        )
      )
      .limit(limit);
  },

  /**
   * Purges an expired document from object storage and updates its status to 'purged'.
   */
  async purgeExpiredDocument(
    document: ResumeDocumentRecord
  ): Promise<boolean> {
    const db = await getDb();
    const storage = getObjectStorageService();

    try {
      await storage.deletePrivateObject(document.storageKey, document.organizationId);
    } catch (err) {
      console.error(`Failed to delete storage file ${document.storageKey} during retention purge:`, err);
    }

    await db
      .update(resumeDocuments)
      .set({
        status: "purged",
        updatedAt: new Date(),
      })
      .where(eq(resumeDocuments.id, document.id));

    await AuditLogger.recordEvent(document.organizationId, {
      eventType: "candidate_deleted",
      jobId: document.jobId,
      candidateId: document.candidateId ?? undefined,
      actor: {
        userId: "system-retention",
        userName: "Automated Retention Worker",
        role: "ADMIN",
      },
      notes: `Retention period expired. Storage object ${document.storageKey} purged under GDPR retention compliance.`,
    });

    return true;
  },

  /**
   * Atomically creates a processing job and an outbox event in a single PostgreSQL transaction.
   * Solves the dual-write problem by guaranteeing neither record is created without the other.
   */
  async createProcessingJobWithOutbox(
    organizationId: string,
    data: {
      id: string;
      jobId: string;
      documentId: string;
      fileName: string;
      fileSize: number;
      fileHash: string;
      storageKey: string;
      idempotencyKey: string;
    }
  ): Promise<{ processingJob: ProcessingJobRecord; outbox: ProcessingOutboxRecord }> {
    const db = await getDb();
    const now = new Date();

    return await db.transaction(async (tx) => {
      const [pJob] = await tx
        .insert(processingJobs)
        .values({
          id: data.id,
          organizationId,
          jobId: data.jobId,
          documentId: data.documentId,
          fileName: data.fileName,
          fileSize: data.fileSize,
          fileHash: data.fileHash,
          status: "QUEUED",
          currentStage: "queued",
          progress: 0,
          attempts: 0,
          maxAttempts: 3,
          idempotencyKey: data.idempotencyKey,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      const outboxPayload: QueueJobPayload = {
        processingJobId: data.id,
        organizationId,
        jobId: data.jobId,
        documentId: data.documentId,
        storageKey: data.storageKey,
        fileName: data.fileName,
        fileHash: data.fileHash,
      };

      const [outbox] = await tx
        .insert(processingOutbox)
        .values({
          id: `outbox-${data.id}`,
          organizationId,
          processingJobId: data.id,
          eventType: "resume.process",
          payload: outboxPayload,
          status: "PENDING",
          attempts: 0,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return { processingJob: pJob, outbox };
    });
  },

  /**
   * Retrieves a processing job by ID, strictly enforcing organization ownership.
   */
  async getProcessingJob(
    organizationId: string,
    processingJobId: string
  ): Promise<ProcessingJobRecord | null> {
    const db = await getDb();
    const [row] = await db
      .select()
      .from(processingJobs)
      .where(
        and(
          eq(processingJobs.id, processingJobId),
          eq(processingJobs.organizationId, organizationId)
        )
      )
      .limit(1);

    return row || null;
  },

  /**
   * Retrieves a processing job by idempotency key, strictly enforcing organization ownership.
   */
  async getProcessingJobByIdempotencyKey(
    organizationId: string,
    idempotencyKey: string
  ): Promise<ProcessingJobRecord | null> {
    const db = await getDb();
    const [row] = await db
      .select()
      .from(processingJobs)
      .where(
        and(
          eq(processingJobs.idempotencyKey, idempotencyKey),
          eq(processingJobs.organizationId, organizationId)
        )
      )
      .limit(1);

    return row || null;
  },

  /**
   * Retrieves paginated processing jobs for a job requisition, enforcing organization ownership.
   */
  async getProcessingJobsByJob(
    organizationId: string,
    jobId: string,
    options?: { limit?: number; offset?: number; status?: string }
  ): Promise<{ items: ProcessingJobRecord[]; total: number }> {
    const db = await getDb();
    const limit = Math.min(options?.limit || 50, 100);
    const offset = Math.max(options?.offset || 0, 0);

    const conditions = [
      eq(processingJobs.jobId, jobId),
      eq(processingJobs.organizationId, organizationId),
    ];
    if (options?.status) {
      conditions.push(eq(processingJobs.status, options.status));
    }

    const whereClause = and(...conditions);

    const items = await db
      .select()
      .from(processingJobs)
      .where(whereClause)
      .orderBy(desc(processingJobs.createdAt))
      .limit(limit)
      .offset(offset);

    const totalCountRows = await db
      .select()
      .from(processingJobs)
      .where(whereClause);

    return { items, total: totalCountRows.length };
  },

  /**
   * Atomically transitions a processing job to PROCESSING status with an incremented attempt count.
   * Ensures mutual exclusion so competing workers cannot double-process the same job.
   */
  async claimProcessingJob(
    processingJobId: string
  ): Promise<ProcessingJobRecord | null> {
    const db = await getDb();
    const now = new Date();

    const [claimed] = await db
      .update(processingJobs)
      .set({
        status: "PROCESSING",
        currentStage: "extracting",
        progress: 10,
        attempts: sql`${processingJobs.attempts} + 1`,
        startedAt: now,
        heartbeatAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(processingJobs.id, processingJobId),
          eq(processingJobs.status, "QUEUED")
        )
      )
      .returning();

    return claimed || null;
  },

  /**
   * Updates stage, progress percentage, and heartbeat of an active processing job.
   */
  async updateProcessingJobProgress(
    processingJobId: string,
    update: {
      stage?: string;
      progress?: number;
      heartbeat?: boolean;
    }
  ): Promise<boolean> {
    const db = await getDb();
    const now = new Date();

    const patch: Partial<typeof processingJobs.$inferInsert> = {
      updatedAt: now,
      ...(update.stage && { currentStage: update.stage }),
      ...(update.progress !== undefined && { progress: update.progress }),
      ...(update.heartbeat && { heartbeatAt: now }),
    };

    await db
      .update(processingJobs)
      .set(patch)
      .where(eq(processingJobs.id, processingJobId));

    return true;
  },

  /**
   * Marks a processing job COMPLETED or PARTIALLY_FAILED and links the created candidate.
   */
  async completeProcessingJob(
    processingJobId: string,
    result: {
      candidateId: string;
      status?: "COMPLETED" | "PARTIALLY_FAILED";
      warnings?: string[];
    }
  ): Promise<boolean> {
    const db = await getDb();
    const now = new Date();

    await db
      .update(processingJobs)
      .set({
        status: result.status || "COMPLETED",
        candidateId: result.candidateId,
        currentStage: "completed",
        progress: 100,
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(processingJobs.id, processingJobId));

    return true;
  },

  /**
   * Records a failure on a processing job with sanitized non-sensitive message.
   * If canRetry is true and attempts < maxAttempts, reverts to QUEUED for exponential backoff.
   */
  async failProcessingJob(
    processingJobId: string,
    error: {
      errorCode: string;
      errorMessage: string;
      canRetry?: boolean;
    }
  ): Promise<ProcessingJobRecord | null> {
    const db = await getDb();
    const now = new Date();

    const [current] = await db
      .select()
      .from(processingJobs)
      .where(eq(processingJobs.id, processingJobId))
      .limit(1);

    if (!current) return null;

    const shouldRetry = error.canRetry && current.attempts < current.maxAttempts;
    const nextStatus = shouldRetry ? "QUEUED" : "FAILED";
    const nextStage = shouldRetry ? "queued" : "failed";

    const [updated] = await db
      .update(processingJobs)
      .set({
        status: nextStatus,
        currentStage: nextStage,
        errorCode: error.errorCode,
        errorMessage: error.errorMessage,
        completedAt: shouldRetry ? null : now,
        updatedAt: now,
      })
      .where(eq(processingJobs.id, processingJobId))
      .returning();

    return updated || null;
  },

  /**
   * Resets an eligible FAILED processing job to QUEUED for recruiter-initiated manual retry.
   * Verifies organization ownership.
   */
  async retryProcessingJob(
    organizationId: string,
    processingJobId: string
  ): Promise<ProcessingJobRecord | null> {
    const db = await getDb();
    const now = new Date();

    return await db.transaction(async (tx) => {
      const [job] = await tx
        .select()
        .from(processingJobs)
        .where(
          and(
            eq(processingJobs.id, processingJobId),
            eq(processingJobs.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!job || (job.status !== "FAILED" && job.status !== "PARTIALLY_FAILED")) {
        return null;
      }

      // Check that document still exists and has not been purged
      const [doc] = await tx
        .select()
        .from(resumeDocuments)
        .where(
          and(
            eq(resumeDocuments.id, job.documentId),
            eq(resumeDocuments.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!doc || doc.status === "purged") {
        return null; // Cannot retry purged documents
      }

      const [updated] = await tx
        .update(processingJobs)
        .set({
          status: "QUEUED",
          currentStage: "queued",
          progress: 0,
          errorCode: null,
          errorMessage: null,
          startedAt: null,
          completedAt: null,
          updatedAt: now,
        })
        .where(eq(processingJobs.id, processingJobId))
        .returning();

      // Ensure outbox event exists for publication
      const outboxPayload: QueueJobPayload = {
        processingJobId: job.id,
        organizationId,
        jobId: job.jobId,
        documentId: job.documentId,
        storageKey: doc.storageKey,
        fileName: job.fileName,
        fileHash: job.fileHash,
      };

      await tx
        .insert(processingOutbox)
        .values({
          id: `outbox-${job.id}-${Date.now()}`,
          organizationId,
          processingJobId: job.id,
          eventType: "resume.process",
          payload: outboxPayload,
          status: "PENDING",
          attempts: 0,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();

      return updated;
    });
  },

  /**
   * Fetches pending outbox events across organizations to publish to queue.
   */
  async getPendingOutboxEvents(limit: number = 20): Promise<ProcessingOutboxRecord[]> {
    const db = await getDb();
    return db
      .select()
      .from(processingOutbox)
      .where(eq(processingOutbox.status, "PENDING"))
      .orderBy(asc(processingOutbox.createdAt))
      .limit(limit);
  },

  /**
   * Marks an outbox event as successfully published to the queue.
   */
  async markOutboxEventPublished(outboxId: string): Promise<boolean> {
    const db = await getDb();
    await db
      .update(processingOutbox)
      .set({
        status: "PUBLISHED",
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(processingOutbox.id, outboxId));
    return true;
  },

  /**
   * Records a failure publishing an outbox event.
   */
  async markOutboxEventFailed(outboxId: string, errorMsg: string): Promise<boolean> {
    const db = await getDb();
    await db
      .update(processingOutbox)
      .set({
        status: "FAILED",
        lastError: errorMsg,
        attempts: sql`${processingOutbox.attempts} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(processingOutbox.id, outboxId));
    return true;
  },

  /**
   * Fetches queued jobs directly for processing (used by worker).
   */
  async getPendingProcessingJobs(limit: number = 10): Promise<ProcessingJobRecord[]> {
    const db = await getDb();
    return db
      .select()
      .from(processingJobs)
      .where(eq(processingJobs.status, "QUEUED"))
      .orderBy(asc(processingJobs.createdAt))
      .limit(limit);
  },

  /**
   * Recovers crashed workers by finding jobs stuck in PROCESSING with stale heartbeats.
   */
  async recoverStaleProcessingJobs(
    staleThresholdMs: number = 5 * 60 * 1000
  ): Promise<{ recoveredCount: number; failedCount: number }> {
    const db = await getDb();
    const cutoff = new Date(Date.now() - staleThresholdMs);

    const staleJobs = await db
      .select()
      .from(processingJobs)
      .where(
        and(
          eq(processingJobs.status, "PROCESSING"),
          lte(processingJobs.heartbeatAt, cutoff)
        )
      );

    let recoveredCount = 0;
    let failedCount = 0;

    for (const job of staleJobs) {
      if (job.attempts < job.maxAttempts) {
        await db
          .update(processingJobs)
          .set({
            status: "QUEUED",
            currentStage: "queued",
            progress: 0,
            errorMessage: "Worker heartbeat expired. Automatically requeued.",
            updatedAt: new Date(),
          })
          .where(eq(processingJobs.id, job.id));
        recoveredCount++;
      } else {
        await db
          .update(processingJobs)
          .set({
            status: "FAILED",
            currentStage: "failed",
            errorCode: "WORKER_TIMEOUT",
            errorMessage: "Processing exceeded maximum worker heartbeat timeout.",
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(processingJobs.id, job.id));
        failedCount++;
      }
    }

    return { recoveredCount, failedCount };
  },

  /**
   * Submits structured pilot feedback from an authorized recruiter.
   * Scoped strictly by organizationId. Validates job and candidate references.
   * Captures snapshot of system score, rank, and recruiter decision.
   * Does NOT mutate match scores or candidate analysis.
   */
  async createPilotFeedback(
    organizationId: string,
    input: {
      jobId: string;
      candidateId?: string;
      category: PilotFeedbackCategory;
      disagreementReason?: PilotDisagreementReason;
      comment?: string;
      perceivedTrustScore?: number;
      perceivedUsefulnessScore?: number;
      timeSavedMinutes?: number;
      metadata?: Record<string, unknown>;
    },
    actor: { userId: string; userName: string; role: UserRole }
  ): Promise<PilotFeedbackEntry | null> {
    const db = await getDb();
    // 1. Verify job belongs to organization
    const job = await this.getJob(organizationId, input.jobId);
    if (!job) return null;

    let analysisId: string | undefined = undefined;
    let systemScore: number | undefined = undefined;
    let systemRank: number | undefined = undefined;
    let recruiterDecision: RecruiterDecision | undefined = undefined;

    // 2. If candidateId provided, verify candidate belongs to this job & org
    if (input.candidateId) {
      const candidate = await this.getCandidate(organizationId, input.candidateId);
      if (!candidate || candidate.jobId !== input.jobId) return null;

      const match = await this.getMatch(organizationId, input.candidateId);
      if (match) {
        analysisId = `analysis-${input.candidateId}`;
        systemScore = match.overallScore;
        recruiterDecision = match.recruiterDecision;

        // Calculate candidate's current system rank in this job
        const allCandidates = await this.getCandidatesWithMatches(organizationId, input.jobId);
        const rankIndex = allCandidates.findIndex((c) => c.candidate.id === input.candidateId);
        if (rankIndex !== -1) {
          systemRank = rankIndex + 1;
        }
      }
    }

    const id = `pfeed-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();

    const [inserted] = await db
      .insert(pilotFeedback)
      .values({
        id,
        organizationId,
        jobId: input.jobId,
        candidateId: input.candidateId || null,
        analysisId: analysisId || null,
        userId: actor.userId,
        category: input.category,
        disagreementReason: input.disagreementReason || null,
        systemRank: systemRank ?? null,
        systemScore: systemScore ?? null,
        recruiterDecision: recruiterDecision ?? null,
        comment: input.comment ? input.comment.trim() : null,
        perceivedTrustScore: input.perceivedTrustScore ?? null,
        perceivedUsefulnessScore: input.perceivedUsefulnessScore ?? null,
        timeSavedMinutes: input.timeSavedMinutes ?? null,
        metadata: input.metadata || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!inserted) return null;

    // Record non-PII audit event for telemetry
    await AuditLogger.recordEvent(organizationId, {
      eventType: "pilot_feedback_submitted",
      jobId: input.jobId,
      candidateId: input.candidateId,
      actor,
      reasonCategory: input.category,
      notes: input.disagreementReason || undefined,
      metadata: {
        feedbackId: id,
        systemRank,
        systemScore,
        recruiterDecision,
        perceivedTrustScore: input.perceivedTrustScore,
        perceivedUsefulnessScore: input.perceivedUsefulnessScore,
      },
    });

    return {
      id: inserted.id,
      organizationId: inserted.organizationId,
      jobId: inserted.jobId,
      candidateId: inserted.candidateId || undefined,
      analysisId: inserted.analysisId || undefined,
      userId: inserted.userId,
      userName: actor.userName,
      category: inserted.category as PilotFeedbackCategory,
      disagreementReason: (inserted.disagreementReason as PilotDisagreementReason) || undefined,
      systemRank: inserted.systemRank ?? undefined,
      systemScore: inserted.systemScore ?? undefined,
      recruiterDecision: (inserted.recruiterDecision as RecruiterDecision) || undefined,
      comment: inserted.comment || undefined,
      perceivedTrustScore: inserted.perceivedTrustScore ?? undefined,
      perceivedUsefulnessScore: inserted.perceivedUsefulnessScore ?? undefined,
      timeSavedMinutes: inserted.timeSavedMinutes ?? undefined,
      metadata: (inserted.metadata as Record<string, unknown>) || undefined,
      createdAt: inserted.createdAt.toISOString(),
    };
  },

  /**
   * Retrieves all pilot feedback for a job, verifying organization ownership.
   */
  async getPilotFeedbackForJob(
    organizationId: string,
    jobId: string
  ): Promise<PilotFeedbackEntry[]> {
    const db = await getDb();
    const job = await this.getJob(organizationId, jobId);
    if (!job) return [];

    const rows = await db
      .select({
        fb: pilotFeedback,
        userName: users.name,
      })
      .from(pilotFeedback)
      .leftJoin(users, eq(pilotFeedback.userId, users.id))
      .where(
        and(
          eq(pilotFeedback.jobId, jobId),
          eq(pilotFeedback.organizationId, organizationId)
        )
      )
      .orderBy(desc(pilotFeedback.createdAt));

    return rows.map(({ fb, userName }) => ({
      id: fb.id,
      organizationId: fb.organizationId,
      jobId: fb.jobId,
      candidateId: fb.candidateId || undefined,
      analysisId: fb.analysisId || undefined,
      userId: fb.userId,
      userName: userName || undefined,
      category: fb.category as PilotFeedbackCategory,
      disagreementReason: (fb.disagreementReason as PilotDisagreementReason) || undefined,
      systemRank: fb.systemRank ?? undefined,
      systemScore: fb.systemScore ?? undefined,
      recruiterDecision: (fb.recruiterDecision as RecruiterDecision) || undefined,
      comment: fb.comment || undefined,
      perceivedTrustScore: fb.perceivedTrustScore ?? undefined,
      perceivedUsefulnessScore: fb.perceivedUsefulnessScore ?? undefined,
      timeSavedMinutes: fb.timeSavedMinutes ?? undefined,
      metadata: (fb.metadata as Record<string, unknown>) || undefined,
      createdAt: fb.createdAt.toISOString(),
    }));
  },

  /**
   * Retrieves pilot feedback for a single candidate, verifying organization ownership.
   */
  async getPilotFeedbackForCandidate(
    organizationId: string,
    candidateId: string
  ): Promise<PilotFeedbackEntry[]> {
    const db = await getDb();
    const candidate = await this.getCandidate(organizationId, candidateId);
    if (!candidate) return [];

    const rows = await db
      .select({
        fb: pilotFeedback,
        userName: users.name,
      })
      .from(pilotFeedback)
      .leftJoin(users, eq(pilotFeedback.userId, users.id))
      .where(
        and(
          eq(pilotFeedback.candidateId, candidateId),
          eq(pilotFeedback.organizationId, organizationId)
        )
      )
      .orderBy(desc(pilotFeedback.createdAt));

    return rows.map(({ fb, userName }) => ({
      id: fb.id,
      organizationId: fb.organizationId,
      jobId: fb.jobId,
      candidateId: fb.candidateId || undefined,
      analysisId: fb.analysisId || undefined,
      userId: fb.userId,
      userName: userName || undefined,
      category: fb.category as PilotFeedbackCategory,
      disagreementReason: (fb.disagreementReason as PilotDisagreementReason) || undefined,
      systemRank: fb.systemRank ?? undefined,
      systemScore: fb.systemScore ?? undefined,
      recruiterDecision: (fb.recruiterDecision as RecruiterDecision) || undefined,
      comment: fb.comment || undefined,
      perceivedTrustScore: fb.perceivedTrustScore ?? undefined,
      perceivedUsefulnessScore: fb.perceivedUsefulnessScore ?? undefined,
      timeSavedMinutes: fb.timeSavedMinutes ?? undefined,
      metadata: (fb.metadata as Record<string, unknown>) || undefined,
      createdAt: fb.createdAt.toISOString(),
    }));
  },

  /**
   * Generates a comprehensive Evaluation Report for a job requisition,
   * synthesizing observed facts, automated predictions, and recruiter judgments.
   */
  async getJobEvaluationReport(
    organizationId: string,
    jobId: string
  ): Promise<JobEvaluationReport | null> {
    const db = await getDb();
    const job = await this.getJob(organizationId, jobId);
    if (!job) return null;

    // 1. Fetch candidate profiles and match analyses
    const candPairs = await this.getCandidatesWithMatches(organizationId, jobId);
    const feedbackList = await this.getPilotFeedbackForJob(organizationId, jobId);

    // 2. Fetch processing jobs metrics for this job
    const pJobs = await db
      .select()
      .from(processingJobs)
      .where(
        and(
          eq(processingJobs.jobId, jobId),
          eq(processingJobs.organizationId, organizationId)
        )
      );

    const totalProcessed = pJobs.length;
    const completedPJobs = pJobs.filter((p) => p.status === "COMPLETED");
    const failedPJobs = pJobs.filter((p) => p.status === "FAILED");
    const failureRatePercent = totalProcessed > 0
      ? Math.round((failedPJobs.length / totalProcessed) * 1000) / 10
      : 0;

    let totalDurationMs = 0;
    let durationCount = 0;
    for (const pj of completedPJobs) {
      if (pj.completedAt && pj.startedAt) {
        totalDurationMs += new Date(pj.completedAt).getTime() - new Date(pj.startedAt).getTime();
        durationCount++;
      }
    }
    const averageProcessingDurationMs = durationCount > 0 ? Math.round(totalDurationMs / durationCount) : null;

    // 3. Candidate rankings array
    const candidateRankings = candPairs.map((pair, index) => ({
      rank: index + 1,
      candidateId: pair.candidate.id,
      candidateName: pair.candidate.name,
      overallScore: pair.match.overallScore,
      aiRecommendation: pair.match.aiRecommendation,
      recruiterDecision: pair.match.recruiterDecision || "unreviewed",
      pipelineStage: pair.match.pipelineStage,
      missingRequirementsCount: pair.match.missingRequirements.length,
      strongMatchesCount: pair.match.strongMatches.length,
      potentialInconsistenciesCount: pair.match.potentialInconsistencies.length,
      relevantExperienceYears: pair.match.relevantExperienceYears,
    }));

    // 4. Summaries & Decision completion
    const totalCandidates = candPairs.length;
    const shortlistedCount = candPairs.filter((c) => c.match.recruiterDecision === "shortlisted").length;
    const maybeCount = candPairs.filter((c) => c.match.recruiterDecision === "maybe").length;
    const rejectedCount = candPairs.filter((c) => c.match.recruiterDecision === "rejected").length;
    const unreviewedCount = candPairs.filter((c) => !c.match.recruiterDecision || c.match.recruiterDecision === "unreviewed").length;
    const reviewedCount = totalCandidates - unreviewedCount;
    const decisionCompletionRatePercent = totalCandidates > 0
      ? Math.round((reviewedCount / totalCandidates) * 1000) / 10
      : 0;

    // 5. Disagreements and reasons breakdown
    const candidateMap = new Map(candPairs.map((c) => [c.candidate.id, c.candidate.name]));
    const disagreementFeedback = feedbackList.filter(
      (f) =>
        f.category === "relevant_ranked_too_low" ||
        f.category === "irrelevant_ranked_too_high" ||
        Boolean(f.disagreementReason)
    );

    const disagreements = disagreementFeedback.map((f) => ({
      candidateId: f.candidateId || "",
      candidateName: (f.candidateId && candidateMap.get(f.candidateId)) || "General Job Feedback",
      systemRank: f.systemRank || 0,
      systemScore: f.systemScore || 0,
      recruiterDecision: f.recruiterDecision || "unreviewed",
      category: f.category,
      disagreementReason: f.disagreementReason,
      comment: f.comment,
      createdAt: f.createdAt,
    }));

    const commonDisagreementReasons: Record<string, number> = {};
    for (const f of disagreementFeedback) {
      if (f.disagreementReason) {
        commonDisagreementReasons[f.disagreementReason] = (commonDisagreementReasons[f.disagreementReason] || 0) + 1;
      }
    }

    const evidenceFeedbackList = feedbackList
      .filter((f) => f.category === "evidence_unsupported" || f.category === "qualification_missing" || f.category === "inconsistency_misleading")
      .map((f) => ({
        candidateId: f.candidateId,
        candidateName: f.candidateId ? candidateMap.get(f.candidateId) : undefined,
        category: f.category,
        comment: f.comment,
        createdAt: f.createdAt,
      }));

    // 6. User-reported trust, usefulness, and time saved
    let totalTrust = 0;
    let trustCount = 0;
    let totalUsefulness = 0;
    let usefulnessCount = 0;
    let totalReportedTimeSavedMinutes = 0;

    for (const f of feedbackList) {
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
    const averageUsefulnessScore = usefulnessCount > 0 ? Math.round((totalUsefulness / usefulnessCount) * 10) / 10 : null;

    // 7. Precision@K calculation
    let precisionAt3: number | null = null;
    if (candPairs.length >= 3) {
      const top3 = candidateRankings.slice(0, 3);
      const top3Shortlisted = top3.filter((c) => c.recruiterDecision === "shortlisted").length;
      precisionAt3 = Math.round((top3Shortlisted / 3) * 100) / 100;
    }

    let precisionAt5: number | null = null;
    if (candPairs.length >= 5) {
      const top5 = candidateRankings.slice(0, 5);
      const top5Shortlisted = top5.filter((c) => c.recruiterDecision === "shortlisted").length;
      precisionAt5 = Math.round((top5Shortlisted / 5) * 100) / 100;
    }

    return {
      job: {
        id: job.id,
        title: job.title,
        company: job.company,
        requirementsUsed: {
          requiredSkills: job.requirements.requiredSkills || [],
          preferredSkills: job.requirements.preferredSkills || [],
          minExperienceYears: job.requirements.minExperienceYears || 0,
          responsibilities: job.requirements.keyResponsibilities || [],
        },
      },
      candidateRankings,
      summary: {
        totalCandidates,
        reviewedCount,
        shortlistedCount,
        maybeCount,
        rejectedCount,
        unreviewedCount,
        decisionCompletionRatePercent,
        rankingDisagreementsCount: disagreements.length,
        evidenceFeedbackCount: evidenceFeedbackList.length,
        averageTrustScore,
        averageUsefulnessScore,
        totalReportedTimeSavedMinutes,
      },
      disagreements,
      evidenceFeedback: evidenceFeedbackList,
      commonDisagreementReasons,
      processingMetrics: {
        totalProcessed,
        averageProcessingDurationMs,
        failureRatePercent,
      },
      rankingMetrics: {
        precisionAt3,
        precisionAt5,
        sampleSize: reviewedCount,
        hasSufficientData: reviewedCount >= 20,
        limitationsNotice:
          "Statistical Disclaimer: Pilot evaluations with N <= 5 recruiters provide qualitative direction and workflow feedback. Small sample sizes are insufficient to claim overall product-market fit or statistically significant ranking superiority.",
      },
      factsVsPredictionsVsJudgments: {
        observedFacts: [
          `Ingested ${totalCandidates} candidate documents across private tenant storage.`,
          `Average background processing latency: ${averageProcessingDurationMs !== null ? `${averageProcessingDurationMs}ms` : "N/A"}.`,
          `Background processing error rate: ${failureRatePercent}%.`,
          `Extracted ${job.requirements.requiredSkills.length} required skills and ${job.requirements.preferredSkills.length} preferred skills from requisition.`,
        ],
        automatedPredictions: [
          "MatchLens composite match score (0 - 100) based on weighted formula.",
          "AI recommendation category (Strong Match, Consider, Review Required, Low Alignment).",
          "Calculated total vs relevant experience years and timeline gap detection.",
          "Conservative transferable skill projections and potential inconsistency warnings.",
        ],
        recruiterJudgments: [
          `Recruiter decision breakdown: ${shortlistedCount} Shortlisted, ${maybeCount} Maybe, ${rejectedCount} Rejected, ${unreviewedCount} Unreviewed.`,
          `Recruiter-recorded ranking disagreements: ${disagreements.length}.`,
          `Recruiter average trust rating: ${averageTrustScore !== null ? `${averageTrustScore}/5.0` : "Not yet rated"}.`,
          `Recruiter average usefulness rating: ${averageUsefulnessScore !== null ? `${averageUsefulnessScore}/5.0` : "Not yet rated"}.`,
        ],
      },
    };
  },
};
