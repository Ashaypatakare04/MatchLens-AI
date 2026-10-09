/**
 * MatchLens AI - Tenant-Scoped Data Access / Repository Layer (PostgreSQL / Drizzle ORM)
 * 
 * Enforces strict multi-tenant organization isolation across all database operations.
 * Mandatory Rule: Every operation involving organization-owned data requires and validates
 * the authorized organizationId. Cross-tenant access attempts return null / false (non-disclosing).
 */

import { getDb } from "../db";
import { jobs, candidates, analyses } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  Job,
  ExtractedJobRequirements,
  CandidateProfile,
  MatchAnalysis,
  ScoringWeights,
  RecruiterDecision,
  PipelineStage,
  RecruiterFeedback,
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
  async createJob(organizationId: string, job: Job): Promise<Job> {
    const db = await getDb();
    const now = new Date();
    await db.insert(jobs).values({
      id: job.id,
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
      createdAt: job.createdAt ? new Date(job.createdAt) : now,
      updatedAt: job.updatedAt ? new Date(job.updatedAt) : now,
    });
    return job;
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
   * Deletes a job, verifying organization ownership. Cascades to candidates and analyses.
   */
  async deleteJob(organizationId: string, id: string): Promise<boolean> {
    const db = await getDb();
    const [existing] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, id), eq(jobs.organizationId, organizationId)))
      .limit(1);

    if (!existing) return false;

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
};
