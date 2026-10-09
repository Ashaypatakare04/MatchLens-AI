/**
 * MatchLens AI - Data Migration Utility
 * 
 * Safely migrates existing legacy .data/db.json and .data/audit-log.json data
 * into the PostgreSQL database.
 */

import fs from "fs";
import path from "path";
import { getDb, closeDb } from "../lib/db";
import { organizations, jobs, candidates, analyses, auditEvents } from "../lib/db/schema";
import { Job, CandidateProfile, MatchAnalysis } from "../lib/types";
import { AuditEvent } from "../lib/engine/audit-logger";

interface LegacyDbSchema {
  jobs: Record<string, Job>;
  candidates: Record<string, CandidateProfile>;
  matches: Record<string, MatchAnalysis>;
}

export async function migrateFromJson(): Promise<{
  jobsMigrated: number;
  candidatesMigrated: number;
  matchesMigrated: number;
  auditEventsMigrated: number;
}> {
  console.log("[Data Migration] Starting migration from JSON to PostgreSQL...");
  const db = await getDb();
  const dataDir = path.join(process.cwd(), ".data");
  const dbFile = path.join(dataDir, "db.json");
  const auditFile = path.join(dataDir, "audit-log.json");

  const targetOrgId = "org-demo-cloudscale";
  await db.insert(organizations).values({
    id: targetOrgId,
    name: "CloudScale Systems",
    slug: "cloudscale",
    createdAt: new Date(),
    updatedAt: new Date(),
  }).onConflictDoNothing();

  let jobsMigrated = 0;
  let candidatesMigrated = 0;
  let matchesMigrated = 0;
  let auditEventsMigrated = 0;

  if (fs.existsSync(dbFile)) {
    try {
      const raw = fs.readFileSync(dbFile, "utf-8");
      const legacy: LegacyDbSchema = JSON.parse(raw);

      // Backup legacy db.json
      fs.copyFileSync(dbFile, path.join(dataDir, "db.json.bak"));
      console.log("[Data Migration] Created backup at .data/db.json.bak");

      // Migrate jobs
      for (const job of Object.values(legacy.jobs || {})) {
        await db
          .insert(jobs)
          .values({
            id: job.id,
            organizationId: targetOrgId,
            title: job.title,
            company: job.company,
            location: job.location,
            workMode: job.workMode,
            employmentType: job.employmentType,
            rawDescription: job.rawDescription,
            requirements: job.requirements,
            weights: job.weights,
            version: 1,
            createdAt: new Date(job.createdAt || Date.now()),
            updatedAt: new Date(job.updatedAt || Date.now()),
          })
          .onConflictDoNothing();
        jobsMigrated++;
      }

      // Migrate candidates
      for (const c of Object.values(legacy.candidates || {})) {
        await db
          .insert(candidates)
          .values({
            id: c.id,
            organizationId: targetOrgId,
            jobId: c.jobId,
            name: c.name,
            email: c.email,
            phone: c.phone || "",
            location: c.location || "",
            totalExperienceYears: c.totalExperienceYears || 0,
            statedExperienceYears: c.statedExperienceYears,
            education: c.education || [],
            workHistory: c.workHistory || [],
            skills: c.skills || [],
            certifications: c.certifications || [],
            projects: c.projects || [],
            achievements: c.achievements || [],
            rawResumeText: c.rawResumeText || "",
            fileName: c.fileName || "resume.pdf",
            fileType: c.fileType || "pdf",
            fileSize: c.fileSize || 0,
            fileHash: c.fileHash || "unknown",
            parsingConfidence: c.parsingConfidence || "medium",
            parsingWarnings: c.parsingWarnings || [],
            extractedAt: new Date(c.extractedAt || Date.now()),
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoNothing();
        candidatesMigrated++;
      }

      // Migrate matches
      for (const m of Object.values(legacy.matches || {})) {
        await db
          .insert(analyses)
          .values({
            id: `analysis-${m.candidateId}`,
            candidateId: m.candidateId,
            jobId: m.jobId,
            overallScore: m.overallScore,
            scoreBreakdown: m.scoreBreakdown,
            weightedContributions: m.weightedContributions,
            skillsAnalysis: m.skillsAnalysis,
            experienceAnalysis: m.experienceAnalysis,
            educationAnalysis: m.educationAnalysis,
            projectAnalysis: m.projectAnalysis,
            responsibilityAlignment: m.responsibilityAlignment,
            requirementMatches: m.requirementMatches,
            totalExperienceYears: m.totalExperienceYears,
            relevantExperienceYears: m.relevantExperienceYears,
            matchingEngine: m.matchingEngine,
            strongMatches: m.strongMatches || [],
            missingRequirements: m.missingRequirements || [],
            potentialInconsistencies: m.potentialInconsistencies || [],
            evidenceLog: m.evidenceLog || [],
            aiRecommendation: m.aiRecommendation || "Consider",
            aiExplanation: m.aiExplanation || "",
            recruiterDecision: m.recruiterDecision || "unreviewed",
            recruiterNotes: m.recruiterNotes || "",
            pipelineStage: m.pipelineStage || "screening",
            recruiterFeedback: m.recruiterFeedback,
            decisionTimestamp: m.decisionTimestamp ? new Date(m.decisionTimestamp) : null,
            analyzedAt: new Date(m.analyzedAt || Date.now()),
            version: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoNothing();
        matchesMigrated++;
      }
    } catch (err) {
      console.error("[Data Migration] Error parsing db.json:", err);
    }
  }

  if (fs.existsSync(auditFile)) {
    try {
      const raw = fs.readFileSync(auditFile, "utf-8");
      const legacyEvents: AuditEvent[] = JSON.parse(raw);
      fs.copyFileSync(auditFile, path.join(dataDir, "audit-log.json.bak"));

      for (const evt of legacyEvents) {
        await db
          .insert(auditEvents)
          .values({
            id: evt.id,
            organizationId: targetOrgId,
            eventType: evt.eventType,
            jobId: evt.jobId,
            candidateId: evt.candidateId,
            actor: evt.actor,
            previousState: evt.previousState,
            newState: evt.newState,
            reasonCategory: evt.reasonCategory,
            notes: evt.notes,
            metadata: evt.metadata,
            timestamp: new Date(evt.timestamp),
          })
          .onConflictDoNothing();
        auditEventsMigrated++;
      }
    } catch (err) {
      console.error("[Data Migration] Error parsing audit-log.json:", err);
    }
  }

  console.log(`[Data Migration] Complete:`);
  console.log(`  Jobs: ${jobsMigrated}`);
  console.log(`  Candidates: ${candidatesMigrated}`);
  console.log(`  Matches: ${matchesMigrated}`);
  console.log(`  Audit Events: ${auditEventsMigrated}`);

  return {
    jobsMigrated,
    candidatesMigrated,
    matchesMigrated,
    auditEventsMigrated,
  };
}

if (require.main === module) {
  migrateFromJson()
    .then(async () => {
      await closeDb();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("[Data Migration] Failed:", err);
      await closeDb();
      process.exit(1);
    });
}
