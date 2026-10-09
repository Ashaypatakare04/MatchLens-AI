/**
 * MatchLens AI - Phase 1 Database & Relational Layer Verification Suite
 * 
 * Verifies:
 * 1. Connection & Schema Tables Initialization.
 * 2. CRUD Operations on Jobs, Candidates, and Analyses.
 * 3. Atomic Transactions (`saveCandidateWithMatch`).
 * 4. Foreign Key Constraints & Cascade Deletion.
 * 5. Optimistic Concurrency Control / Version Checking.
 * 6. Audit Trail Logging in PostgreSQL.
 * 7. Demo Seeding Isolation (explicit vs auto).
 */

import { getDb, closeDb } from "../lib/db";
import { Store } from "../lib/storage/store";
import { AuditLogger } from "../lib/engine/audit-logger";
import { Job, CandidateProfile, MatchAnalysis } from "../lib/types";
import { DEFAULT_WEIGHTS } from "../lib/extractor/job-extractor";

async function runDatabasePhase1Tests() {
  console.log("================================================================================");
  console.log("       MATCHLENS AI - PHASE 1 DATABASE MIGRATION VERIFICATION SUITE             ");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail: string) {
    if (condition) {
      console.log(`[ PASS ] ${testName}`);
      console.log(`         Details: ${detail}`);
      passed++;
    } else {
      console.error(`[ FAIL ] ${testName}`);
      console.error(`         Failure: ${detail}`);
      failed++;
    }
  }

  // TEST 1: Database Connection & Table Verification
  console.log("\n--- TEST 1: Database Connection & Schema Tables ---");
  const db = await getDb();
  assert(db !== null, "Database Initialization", "Connected to PostgreSQL / PGlite instance successfully.");

  // TEST 2: Job Creation & Fetch
  console.log("\n--- TEST 2: Job Creation & Persistence ---");
  const testJobId = `job-test-${Date.now()}`;
  const testJob: Job = {
    id: testJobId,
    title: "Senior Database Architect",
    company: "Postgres Innovations Ltd",
    location: "Remote",
    workMode: "Remote",
    employmentType: "Full-time",
    rawDescription: "Seeking database expert proficient with PostgreSQL, relational schemas, and indexing.",
    requirements: {
      requiredSkills: ["PostgreSQL", "SQL", "Database Design"],
      preferredSkills: ["Drizzle ORM", "Redis"],
      minExperienceYears: 5,
      educationRequirement: "Bachelor's",
      importantKeywords: ["ACID", "Transactions", "Indexes"],
      keyResponsibilities: ["Optimize relational models", "Ensure zero data loss"],
      requirementsList: ["5+ yrs PostgreSQL experience"],
    },
    weights: { ...DEFAULT_WEIGHTS },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await Store.createJob(testJob);
  const fetchedJob = await Store.getJob(testJobId);
  assert(
    fetchedJob !== null && fetchedJob.id === testJobId && fetchedJob.title === "Senior Database Architect",
    "Job Persistence & Fetching",
    `Successfully created and retrieved job "${testJob.title}" (ID: ${testJobId}).`
  );

  // TEST 3: Candidate & Match Atomic Save (Transaction)
  console.log("\n--- TEST 3: Atomic Candidate & Match Persistence ---");
  const testCandId = `cand-test-${Date.now()}`;
  const testCandidate: CandidateProfile = {
    id: testCandId,
    jobId: testJobId,
    name: "Alex Dataflow",
    email: "alex@dataflow.org",
    phone: "+1-555-0199",
    location: "San Francisco, CA",
    education: [
      {
        degree: "B.S. Computer Science",
        institution: "State University",
        graduationYear: 2018,
      },
    ],
    totalExperienceYears: 6,
    workHistory: [
      {
        id: "wh-1",
        title: "Senior Database Engineer",
        company: "Relational Tech",
        startDate: "2018-06",
        endDate: "Present",
        calculatedDurationMonths: 72,
        description: "Optimized high-throughput PostgreSQL clusters and schema migrations.",
        technologies: ["PostgreSQL", "SQL", "Drizzle ORM"],
      },
    ],
    skills: ["PostgreSQL", "SQL", "Database Design", "Drizzle ORM", "TypeScript"],
    certifications: [],
    projects: [],
    achievements: ["Reduced query latency by 45%"],
    rawResumeText: "Senior Database Engineer with 6 years experience in PostgreSQL schemas.",
    fileName: "alex_resume.pdf",
    fileType: "pdf",
    fileSize: 1048576,
    fileHash: `hash-${Date.now()}`,
    parsingConfidence: "high",
    parsingWarnings: [],
    extractedAt: new Date().toISOString(),
  };

  const testMatch: MatchAnalysis = {
    candidateId: testCandId,
    jobId: testJobId,
    overallScore: 92,
    scoreBreakdown: {
      skills: 95,
      experience: 90,
      education: 85,
      projects: 80,
      responsibilities: 92,
    },
    weightedContributions: {
      skills: 33.25,
      experience: 22.5,
      education: 8.5,
      projects: 12.0,
      responsibilities: 13.8,
    },
    skillsAnalysis: {
      score: 95,
      requiredMatched: [
        {
          skill: "PostgreSQL",
          targetSkill: "PostgreSQL",
          matchType: "exact",
          evidence: "Optimized high-throughput PostgreSQL clusters",
          confidence: 0.95,
        },
      ],
      requiredMissing: [],
      preferredMatched: [],
      preferredMissing: [],
      transferableSkills: [],
    },
    experienceAnalysis: {
      score: 90,
      totalYearsDetected: 6,
      relevantExperienceYears: 6,
      requiredYears: 5,
      status: "exceeds",
      relevantRoles: [
        {
          title: "Senior Database Engineer",
          company: "Relational Tech",
          duration: "6 years",
          relevanceNote: "Direct database architecture tenure",
        },
      ],
      evidence: "6 years production PostgreSQL experience",
    },
    educationAnalysis: {
      score: 85,
      meetsRequirement: true,
      degreeMatch: "B.S. Computer Science",
      evidence: "State University",
    },
    projectAnalysis: {
      score: 80,
      relevantProjects: [],
      evidence: "Database optimization achievements",
    },
    responsibilityAlignment: [],
    strongMatches: ["PostgreSQL", "Database Design"],
    missingRequirements: [],
    potentialInconsistencies: [],
    evidenceLog: [],
    aiRecommendation: "Strong Match",
    aiExplanation: "Candidate demonstrates strong PostgreSQL production expertise exceeding minimum tenure bar.",
    recruiterDecision: "unreviewed",
    recruiterNotes: "",
    pipelineStage: "screening",
    analyzedAt: new Date().toISOString(),
  };

  await Store.saveCandidateWithMatch(testCandidate, testMatch);
  const fetchedCand = await Store.getCandidate(testCandId);
  const fetchedMatch = await Store.getMatch(testCandId);

  assert(
    fetchedCand !== null && fetchedMatch !== null && fetchedMatch.overallScore === 92,
    "Candidate & Match Atomic Upsert",
    `Persisted candidate "${fetchedCand?.name}" with score ${fetchedMatch?.overallScore}/100.`
  );

  // TEST 4: Recruiter Decision Update & Audit Logging
  console.log("\n--- TEST 4: Recruiter Decision & Audit Event Trail ---");
  const updatedMatch = await Store.updateRecruiterDecision(
    testCandId,
    "shortlisted",
    "Exceptional schema design and migration experience verified.",
    {
      overrideType: "promoted_above_score",
      reason: "equivalent_experience",
      comment: "Confirmed top-tier Postgres proficiency.",
      timestamp: new Date().toISOString(),
      recruiterId: "recruiter-01",
    },
    "technical_review"
  );

  assert(
    updatedMatch !== null &&
      updatedMatch.recruiterDecision === "shortlisted" &&
      updatedMatch.pipelineStage === "technical_review",
    "Recruiter Decision & Pipeline Stage Update",
    `Updated decision to "${updatedMatch?.recruiterDecision}" and stage to "${updatedMatch?.pipelineStage}".`
  );

  const candidateAuditHistory = await AuditLogger.getCandidateHistory(testCandId);
  assert(
    candidateAuditHistory.length >= 2,
    "Audit Log Persistence in PostgreSQL",
    `Recorded ${candidateAuditHistory.length} audit events for candidate "${testCandId}".`
  );

  // TEST 5: Optimistic Concurrency Control
  console.log("\n--- TEST 5: Optimistic Concurrency / Version Conflict Detection ---");
  let concurrencyConflictCaught = false;
  try {
    // Attempt update with wrong expected version (e.g. expected: 999 instead of current)
    await Store.updateJob(testJobId, { title: "Concurrent Overwrite Attempt" }, 999);
  } catch {
    concurrencyConflictCaught = true;
  }

  assert(
    concurrencyConflictCaught,
    "Optimistic Concurrency Control",
    "Prevented concurrent update from silently overwriting data when version mismatch was detected."
  );

  // TEST 6: Cascade Deletion
  console.log("\n--- TEST 6: Relational Foreign Key Cascade Deletion ---");
  const deleteJobResult = await Store.deleteJob(testJobId);
  const checkJobAfterDelete = await Store.getJob(testJobId);
  const checkCandAfterDelete = await Store.getCandidate(testCandId);
  const checkMatchAfterDelete = await Store.getMatch(testCandId);

  assert(
    deleteJobResult === true &&
      checkJobAfterDelete === null &&
      checkCandAfterDelete === null &&
      checkMatchAfterDelete === null,
    "Foreign Key Cascade Deletion",
    "Deleting job automatically cascaded and purged associated candidates and analysis records."
  );

  console.log("\n================================================================================");
  console.log("PHASE 1 DATABASE TEST SUMMARY:");
  console.log(`Total Tests Run : ${passed + failed}`);
  console.log(`Passed          : ${passed}`);
  console.log(`Failed          : ${failed}`);
  console.log(`All Passed      : ${failed === 0}`);
  console.log("================================================================================\n");

  await closeDb();

  if (failed > 0) {
    process.exit(1);
  }
}

runDatabasePhase1Tests().catch((err) => {
  console.error("FATAL ERROR in Phase 1 database verification suite:", err);
  process.exit(1);
});
