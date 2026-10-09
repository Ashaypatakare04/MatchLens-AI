/**
 * MatchLens AI - Primary Data Access / Repository Layer (PostgreSQL / Drizzle ORM)
 * 
 * Replaces legacy synchronous file-based storage (.data/db.json) with
 * transactional, concurrent-safe PostgreSQL relational persistence.
 */

import { getDb } from "../db";
import { jobs, candidates, analyses } from "../db/schema";
import { eq, desc } from "drizzle-orm";
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
import { seedDemoData } from "../db/seed";

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
  async getJobs(): Promise<Job[]> {
    const db = await getDb();
    const rows = await db.select().from(jobs).orderBy(desc(jobs.createdAt));
    return rows.map(mapJobRow);
  },

  async getJob(id: string): Promise<Job | null> {
    const db = await getDb();
    const [row] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
    return row ? mapJobRow(row) : null;
  },

  async createJob(job: Job): Promise<Job> {
    const db = await getDb();
    const now = new Date();
    await db.insert(jobs).values({
      id: job.id,
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

  async updateJob(
    id: string,
    updates: Partial<Job>,
    expectedVersion?: number
  ): Promise<Job | null> {
    const db = await getDb();
    const [existing] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
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
      .where(eq(jobs.id, id))
      .returning();

    return updated ? mapJobRow(updated) : null;
  },

  async deleteJob(id: string): Promise<boolean> {
    const db = await getDb();
    const [existing] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
    if (!existing) return false;

    // Foreign key cascading deletes associated candidates & analyses in PostgreSQL
    await db.delete(jobs).where(eq(jobs.id, id));
    return true;
  },

  async getCandidates(jobId: string): Promise<CandidateProfile[]> {
    const db = await getDb();
    const rows = await db.select().from(candidates).where(eq(candidates.jobId, jobId));
    return rows.map(mapCandidateRow);
  },

  async getCandidate(id: string): Promise<CandidateProfile | null> {
    const db = await getDb();
    const [row] = await db.select().from(candidates).where(eq(candidates.id, id)).limit(1);
    return row ? mapCandidateRow(row) : null;
  },

  async getMatches(jobId: string): Promise<MatchAnalysis[]> {
    const db = await getDb();
    const rows = await db
      .select()
      .from(analyses)
      .where(eq(analyses.jobId, jobId))
      .orderBy(desc(analyses.overallScore));
    return rows.map(mapAnalysisRow);
  },

  async getMatch(candidateId: string): Promise<MatchAnalysis | null> {
    const db = await getDb();
    const [row] = await db
      .select()
      .from(analyses)
      .where(eq(analyses.candidateId, candidateId))
      .limit(1);
    return row ? mapAnalysisRow(row) : null;
  },

  async saveCandidateWithMatch(
    candidate: CandidateProfile,
    match: MatchAnalysis
  ): Promise<void> {
    const db = await getDb();
    const now = new Date();

    // Use transaction for atomic candidate and match persistence
    await db.transaction(async (tx) => {
      await tx
        .insert(candidates)
        .values({
          id: candidate.id,
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

  async deleteCandidate(candidateId: string): Promise<boolean> {
    const db = await getDb();
    const [cand] = await db.select().from(candidates).where(eq(candidates.id, candidateId)).limit(1);
    if (!cand) return false;

    const jobId = cand.jobId;
    await db.delete(candidates).where(eq(candidates.id, candidateId));

    await AuditLogger.recordEvent({
      eventType: "candidate_deleted",
      jobId,
      candidateId,
      actor: {
        userId: "recruiter-default",
        userName: "Primary Recruiter",
        role: "RECRUITER",
      },
      notes: "Candidate PII and match records purged per GDPR / Right-to-Delete compliance request.",
    });

    return true;
  },

  async updateRecruiterDecision(
    candidateId: string,
    decision: RecruiterDecision,
    notes?: string,
    feedback?: RecruiterFeedback,
    pipelineStage?: PipelineStage
  ): Promise<MatchAnalysis | null> {
    const db = await getDb();
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

    await AuditLogger.recordEvent({
      eventType: "candidate_decision_changed",
      jobId: match.jobId,
      candidateId,
      actor: {
        userId: feedback?.recruiterId || "recruiter-default",
        userName: "Primary Recruiter",
        role: "RECRUITER",
      },
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
      await AuditLogger.recordEvent({
        eventType: "recruiter_calibration_feedback",
        jobId: match.jobId,
        candidateId,
        actor: {
          userId: feedback.recruiterId || "recruiter-default",
          userName: "Primary Recruiter",
          role: "RECRUITER",
        },
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

  async rescoreJob(jobId: string, weights: ScoringWeights): Promise<MatchAnalysis[]> {
    const db = await getDb();
    const [jobRow] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
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
      .where(eq(jobs.id, jobId));

    const candidateRows = await db
      .select()
      .from(candidates)
      .where(eq(candidates.jobId, jobId));
    const candProfiles = candidateRows.map(mapCandidateRow);

    const existingMatchRows = await db
      .select()
      .from(analyses)
      .where(eq(analyses.jobId, jobId));
    const existingMatchesMap = new Map(existingMatchRows.map((r) => [r.candidateId, mapAnalysisRow(r)]));

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

      await this.saveCandidateWithMatch(cand, newAnalysis);
      updatedMatches.push(newAnalysis);
    }

    await AuditLogger.recordEvent({
      eventType: "weights_recalculated",
      jobId,
      actor: {
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

  async updateJobRequirements(
    jobId: string,
    requirements: ExtractedJobRequirements
  ): Promise<{ job: Job; updatedCount: number } | null> {
    const db = await getDb();
    const [jobRow] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
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
      .where(eq(jobs.id, jobId));

    const candidateRows = await db
      .select()
      .from(candidates)
      .where(eq(candidates.jobId, jobId));
    const candProfiles = candidateRows.map(mapCandidateRow);

    const existingMatchRows = await db
      .select()
      .from(analyses)
      .where(eq(analyses.jobId, jobId));
    const existingMatchesMap = new Map(existingMatchRows.map((r) => [r.candidateId, mapAnalysisRow(r)]));

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
      await this.saveCandidateWithMatch(cand, newAnalysis);
    }

    await AuditLogger.recordEvent({
      eventType: "weights_recalculated",
      jobId,
      actor: {
        userId: "recruiter-default",
        userName: "Primary Recruiter",
        role: "RECRUITER",
      },
      notes: `Requisition criteria updated: ${requirements.requiredSkills.length} required skills, ${requirements.minExperienceYears}+ yrs tenure. Re-evaluated ${candProfiles.length} candidates.`,
    });

    return { job, updatedCount: candProfiles.length };
  },

  async resetDemoData(): Promise<{ job: Job; candidatesCount: number }> {
    const { jobId, candidateCount } = await seedDemoData();
    const job = await this.getJob(jobId);
    if (!job) {
      throw new Error("Failed to load demo job after seeding");
    }
    return { job, candidatesCount: candidateCount };
  },
};
