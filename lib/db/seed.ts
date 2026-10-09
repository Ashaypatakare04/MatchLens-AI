/**
 * MatchLens AI - Explicit Demo Data Seeding Script
 * 
 * Explicitly seeds demo organization, users, job, and synthetic candidate profiles into PostgreSQL.
 * Isolated from production request paths so synthetic data is never
 * automatically injected into real customer workspaces.
 */

import { getDb, closeDb } from "./index";
import { organizations, users, jobs, candidates, analyses, auditEvents } from "./schema";
import { getSeededDemoCandidates } from "../demo-data";
import bcrypt from "bcryptjs";

export const DEMO_ORG_ID = "org-demo-cloudscale";
export const DEMO_RECRUITER_ID = "user-demo-recruiter";
export const DEMO_ADMIN_ID = "user-demo-admin";

export async function seedDemoData(): Promise<{
  organizationId: string;
  jobId: string;
  candidateCount: number;
}> {
  console.log("[Demo Seed] Starting explicit demo data seeding...");
  const db = await getDb();
  const { job, candidates: demoCandidates, matches } = getSeededDemoCandidates();

  // 1. Seed demo organization
  await db
    .insert(organizations)
    .values({
      id: DEMO_ORG_ID,
      name: "CloudScale Technologies",
      slug: "cloudscale",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: organizations.id,
      set: {
        name: "CloudScale Technologies",
        slug: "cloudscale",
        updatedAt: new Date(),
      },
    });

  console.log(`[Demo Seed] Seeded organization: ${DEMO_ORG_ID}`);

  // 2. Seed demo users
  const defaultPasswordHash = bcrypt.hashSync("MatchLens2026!", 10);

  await db
    .insert(users)
    .values({
      id: DEMO_ADMIN_ID,
      organizationId: DEMO_ORG_ID,
      email: "admin@cloudscale.internal",
      name: "CloudScale Admin",
      passwordHash: defaultPasswordHash,
      role: "ADMIN",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        name: "CloudScale Admin",
        organizationId: DEMO_ORG_ID,
        role: "ADMIN",
        updatedAt: new Date(),
      },
    });

  await db
    .insert(users)
    .values({
      id: DEMO_RECRUITER_ID,
      organizationId: DEMO_ORG_ID,
      email: "recruiter@cloudscale.internal",
      name: "Primary Recruiter",
      passwordHash: defaultPasswordHash,
      role: "RECRUITER",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        name: "Primary Recruiter",
        organizationId: DEMO_ORG_ID,
        role: "RECRUITER",
        updatedAt: new Date(),
      },
    });

  console.log("[Demo Seed] Seeded demo users (admin & recruiter)");

  // 3. Seed demo job
  await db
    .insert(jobs)
    .values({
      id: job.id,
      organizationId: DEMO_ORG_ID,
      title: job.title,
      company: job.company,
      location: job.location,
      workMode: job.workMode,
      employmentType: job.employmentType,
      rawDescription: job.rawDescription,
      requirements: job.requirements,
      weights: job.weights,
      version: 1,
      createdAt: new Date(job.createdAt),
      updatedAt: new Date(job.updatedAt),
    })
    .onConflictDoUpdate({
      target: jobs.id,
      set: {
        organizationId: DEMO_ORG_ID,
        title: job.title,
        company: job.company,
        location: job.location,
        requirements: job.requirements,
        weights: job.weights,
        updatedAt: new Date(),
      },
    });

  console.log(`[Demo Seed] Seeded job: ${job.id}`);

  // 4. Seed candidates and analyses
  for (const c of demoCandidates) {
    await db
      .insert(candidates)
      .values({
        id: c.id,
        organizationId: DEMO_ORG_ID,
        jobId: c.jobId,
        name: c.name,
        email: c.email,
        phone: c.phone,
        location: c.location,
        totalExperienceYears: c.totalExperienceYears,
        statedExperienceYears: c.statedExperienceYears,
        education: c.education,
        workHistory: c.workHistory,
        skills: c.skills,
        certifications: c.certifications,
        projects: c.projects,
        achievements: c.achievements,
        rawResumeText: c.rawResumeText,
        fileName: c.fileName,
        fileType: c.fileType,
        fileSize: c.fileSize,
        fileHash: c.fileHash,
        parsingConfidence: c.parsingConfidence,
        parsingWarnings: c.parsingWarnings,
        extractedAt: new Date(c.extractedAt),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: candidates.id,
        set: {
          organizationId: DEMO_ORG_ID,
          name: c.name,
          email: c.email,
          skills: c.skills,
          totalExperienceYears: c.totalExperienceYears,
          updatedAt: new Date(),
        },
      });

    const m = matches.find((match) => match.candidateId === c.id);
    if (m) {
      await db
        .insert(analyses)
        .values({
          id: `analysis-${c.id}`,
          candidateId: c.id,
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
          strongMatches: m.strongMatches,
          missingRequirements: m.missingRequirements,
          potentialInconsistencies: m.potentialInconsistencies,
          evidenceLog: m.evidenceLog,
          aiRecommendation: m.aiRecommendation,
          aiExplanation: m.aiExplanation,
          recruiterDecision: m.recruiterDecision,
          recruiterNotes: m.recruiterNotes,
          pipelineStage: m.pipelineStage,
          decisionTimestamp: m.decisionTimestamp ? new Date(m.decisionTimestamp) : null,
          analyzedAt: new Date(m.analyzedAt),
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: analyses.candidateId,
          set: {
            overallScore: m.overallScore,
            scoreBreakdown: m.scoreBreakdown,
            skillsAnalysis: m.skillsAnalysis,
            updatedAt: new Date(),
          },
        });
    }
  }

  // 5. Record initial audit event
  await db.insert(auditEvents).values({
    id: `audit-${Date.now()}-seed`,
    organizationId: DEMO_ORG_ID,
    eventType: "resume_uploaded",
    jobId: job.id,
    actor: {
      userId: DEMO_ADMIN_ID,
      userName: "CloudScale Admin",
      role: "ADMIN",
    },
    notes: `Seeded ${demoCandidates.length} benchmark demo candidates for organization ${DEMO_ORG_ID}.`,
    timestamp: new Date(),
  });

  console.log(`[Demo Seed] Successfully seeded ${demoCandidates.length} candidate profiles and analyses.`);
  return {
    organizationId: DEMO_ORG_ID,
    jobId: job.id,
    candidateCount: demoCandidates.length,
  };
}

// Allow direct CLI execution: `npx tsx lib/db/seed.ts`
if (require.main === module) {
  seedDemoData()
    .then(async () => {
      await closeDb();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("[Demo Seed] Error:", err);
      await closeDb();
      process.exit(1);
    });
}
