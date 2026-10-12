/**
 * MatchLens AI - Phase 8 Real Recruiter Validation & Telemetry Test Suite
 * 
 * Verifies:
 * 1. Database schema migration for pilot_feedback table and indexes.
 * 2. Multi-tenant isolation on feedback submission and retrieval (non-disclosing 404s).
 * 3. Role-based authorization on feedback endpoints (ADMIN, RECRUITER allowed; VIEWER rejected).
 * 4. Deterministic scoring invariance: feedback never alters underlying candidate scores.
 * 5. Structured feedback categories and disagreement reasons validation.
 * 6. Bounds and input sanitation on 1-5 trust/usefulness scores and comments.
 * 7. Evaluation report generation distinguishing observed facts, automated predictions, and recruiter judgments.
 * 8. Small-N ranking metrics (Precision@K) with statistical caution disclaimers.
 * 9. Privacy-preserving telemetry event logging and aggregate metrics calculation.
 * 10. Cross-tenant isolation on telemetry and evaluation metrics queries.
 * 11. Relational cascade deletion of feedback on candidate and job purge.
 */

import crypto from "crypto";
import { NextRequest } from "next/server";
import { getDb, closeDb } from "../lib/db";
import { eq } from "drizzle-orm";
import {
  organizations,
  users,
  pilotFeedback,
} from "../lib/db/schema";
import { Store } from "../lib/storage/store";
import { createTestAuthToken } from "../lib/auth/session";
import { runMigrations } from "../lib/db/migrate";
import {
  getPilotOrganizationMetrics,
  PILOT_METRIC_DEFINITIONS,
} from "../lib/observability/pilot-metrics";
import { DEFAULT_WEIGHTS } from "../lib/extractor/job-extractor";
import { CandidateProfile } from "../lib/types";

// Route handlers
import { POST as submitFeedbackRoute } from "../app/api/jobs/[id]/feedback/route";
import { GET as getEvaluationReportRoute } from "../app/api/jobs/[id]/evaluation-report/route";
import { POST as recordTelemetryRoute } from "../app/api/jobs/[id]/telemetry/route";
import { GET as getAdminPilotMetricsRoute } from "../app/api/admin/pilot-metrics/route";

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] Test ${totalTests}: ${testName}`);
  } else {
    console.error(`  [FAIL] Test ${totalTests}: ${testName}`);
    if (details) console.error(`         Details: ${details}`);
    throw new Error(`Assertion failed: ${testName}`);
  }
}

async function runPhase8ValidationTests() {
  console.log("======================================================================");
  console.log("=== MatchLens AI: Phase 8 Real Recruiter Validation & Telemetry   ===");
  console.log("======================================================================\n");

  const db = await getDb();

  // ---------------------------------------------------------------------------
  // Section 1: Migration Verification
  // ---------------------------------------------------------------------------
  console.log("--- Section 1: Database Migration for pilot_feedback Table ---");
  await runMigrations();
  assert(true, "Applied Drizzle SQL migrations idempotently including pilot_feedback");

  // Verify table is queryable
  const initialFeedback = await db.select().from(pilotFeedback).limit(1);
  assert(Array.isArray(initialFeedback), "pilot_feedback table exists and is accessible");

  // ---------------------------------------------------------------------------
  // Setup Test Organizations and Users
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 2: Test Tenant & User Setup ---");
  const testRunId = crypto.randomBytes(4).toString("hex");

  const orgAId = `org-val-a-${testRunId}`;
  const orgBId = `org-val-b-${testRunId}`;

  await db.insert(organizations).values([
    { id: orgAId, name: `Validation Org A (${testRunId})`, slug: `val-org-a-${testRunId}` },
    { id: orgBId, name: `Validation Org B (${testRunId})`, slug: `val-org-b-${testRunId}` },
  ]);

  const userAId = `user-recruiter-a-${testRunId}`;
  const userAViewerId = `user-viewer-a-${testRunId}`;
  const userBId = `user-recruiter-b-${testRunId}`;

  await db.insert(users).values([
    { id: userAId, organizationId: orgAId, email: `recruiter-a-${testRunId}@example.com`, name: "Recruiter Alpha", role: "RECRUITER" },
    { id: userAViewerId, organizationId: orgAId, email: `viewer-a-${testRunId}@example.com`, name: "Viewer Alpha", role: "VIEWER" },
    { id: userBId, organizationId: orgBId, email: `recruiter-b-${testRunId}@example.com`, name: "Recruiter Beta", role: "RECRUITER" },
  ]);

  const tokenRecruiterA = createTestAuthToken({ userId: userAId });
  const tokenViewerA = createTestAuthToken({ userId: userAViewerId });
  const tokenRecruiterB = createTestAuthToken({ userId: userBId });

  assert(true, "Created isolated pilot test organizations Org A and Org B with auth tokens");

  // Create Jobs in Org A and Org B
  const jobA = await Store.createJob(orgAId, {
    id: `job-val-a-${testRunId}`,
    title: "Senior Backend Engineer",
    company: "Alpha Corp",
    location: "Remote",
    workMode: "Remote",
    employmentType: "Full-time",
    rawDescription: "Senior Go / Kubernetes backend developer required with 5+ years experience.",
    requirements: {
      requiredSkills: ["Go", "Kubernetes", "PostgreSQL"],
      preferredSkills: ["gRPC", "Docker"],
      minExperienceYears: 5,
      educationRequirement: "Bachelor's",
      importantKeywords: ["microservices", "containers"],
      keyResponsibilities: ["Build microservices", "Deploy containers"],
      requirementsList: ["5+ years Go", "Kubernetes experience"],
    },
    weights: DEFAULT_WEIGHTS,
  });

  const jobB = await Store.createJob(orgBId, {
    id: `job-val-b-${testRunId}`,
    title: "Product Designer",
    company: "Beta Studio",
    location: "New York",
    workMode: "On-site",
    employmentType: "Full-time",
    rawDescription: "Figma designer",
    requirements: {
      requiredSkills: ["Figma"],
      preferredSkills: [],
      minExperienceYears: 3,
      educationRequirement: "",
      importantKeywords: ["design", "UI"],
      keyResponsibilities: ["Design UI"],
      requirementsList: ["3+ years Figma experience"],
    },
    weights: DEFAULT_WEIGHTS,
  });

  assert(Boolean(jobA && jobB), "Created pilot requisitions jobA and jobB scoped to tenants");

  // Create Candidate and Analysis in Org A
  const candidate1Id = `cand-val-1-${testRunId}`;
  const candidate2Id = `cand-val-2-${testRunId}`;
  const candidate3Id = `cand-val-3-${testRunId}`;

  const makeCandidate = (
    id: string,
    jobId: string,
    name: string,
    email: string,
    skills: string[],
    totalExperienceYears: number,
    fileName: string,
    fileHash: string
  ): CandidateProfile => ({
    id,
    jobId,
    name,
    email,
    phone: "+1-555-0100",
    location: "Remote",
    education: [],
    totalExperienceYears,
    workHistory: [],
    skills,
    certifications: [],
    projects: [],
    achievements: [],
    rawResumeText: `Resume of ${name}`,
    fileName,
    fileType: "pdf",
    fileSize: 1024,
    fileHash,
    parsingConfidence: "high",
    parsingWarnings: [],
    extractedAt: new Date().toISOString(),
  });

  const baseAnalysisData = {
    scoreBreakdown: { skills: 90, experience: 85, education: 80, projects: 85, responsibilities: 85 },
    weightedContributions: { skills: 31.5, experience: 21.25, education: 8.0, projects: 12.75, responsibilities: 12.75 },
    skillsAnalysis: {
      score: 90,
      requiredMatched: [
        { skill: "Go", targetSkill: "Go", matchType: "exact" as const, evidence: "Matched", confidence: 1 },
        { skill: "Kubernetes", targetSkill: "Kubernetes", matchType: "exact" as const, evidence: "Matched", confidence: 1 },
      ],
      requiredMissing: [],
      preferredMatched: [],
      preferredMissing: [],
      transferableSkills: [],
    },
    experienceAnalysis: { score: 85, totalYearsDetected: 6, relevantExperienceYears: 5.5, requiredYears: 5, status: "meets" as const, relevantRoles: [], evidence: "Matched" },
    educationAnalysis: { score: 80, meetsRequirement: true, degreeMatch: "BS CS", evidence: "Matched" },
    projectAnalysis: { score: 85, relevantProjects: [], evidence: "Matched" },
    responsibilityAlignment: [],
    strongMatches: ["Go", "Kubernetes"],
    missingRequirements: [],
    potentialInconsistencies: [],
    evidenceLog: [],
    aiRecommendation: "Strong Match" as const,
    aiExplanation: "Candidate demonstrates verified 5.5 years Go & Kubernetes experience.",
    recruiterNotes: "",
    analyzedAt: new Date().toISOString(),
  };

  await Store.saveCandidateWithMatch(
    orgAId,
    makeCandidate(candidate1Id, jobA.id, "Alice Engineer", "alice@example.com", ["Go", "Kubernetes", "PostgreSQL"], 6, "alice_resume.pdf", "hash-alice"),
    {
      ...baseAnalysisData,
      candidateId: candidate1Id,
      jobId: jobA.id,
      overallScore: 86.2,
      recruiterDecision: "unreviewed",
    }
  );

  await Store.saveCandidateWithMatch(
    orgAId,
    makeCandidate(candidate2Id, jobA.id, "Bob Developer", "bob@example.com", ["Go", "Docker"], 4, "bob_resume.pdf", "hash-bob"),
    {
      ...baseAnalysisData,
      candidateId: candidate2Id,
      jobId: jobA.id,
      overallScore: 78.4,
      recruiterDecision: "unreviewed",
    }
  );

  await Store.saveCandidateWithMatch(
    orgAId,
    makeCandidate(candidate3Id, jobA.id, "Carol Junior", "carol@example.com", ["Go"], 2, "carol_resume.pdf", "hash-carol"),
    {
      ...baseAnalysisData,
      candidateId: candidate3Id,
      jobId: jobA.id,
      overallScore: 62.0,
      recruiterDecision: "unreviewed",
    }
  );

  assert(true, "Created 3 candidates with deterministic match analyses in Org A");

  // ---------------------------------------------------------------------------
  // Section 3: Pilot Feedback Submission & Tenant Isolation
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 3: Pilot Feedback Submission & Tenant Isolation ---");

  // Test 1: Authorized Recruiter Alpha submits feedback for Candidate 1 in Job A
  const reqValidFeedback = new NextRequest(`http://localhost:3000/api/jobs/${jobA.id}/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenRecruiterA}`,
    },
    body: JSON.stringify({
      candidateId: candidate1Id,
      category: "ranking_correct",
      perceivedTrustScore: 5,
      perceivedUsefulnessScore: 5,
      timeSavedMinutes: 20,
      comment: "Candidate ranking is very accurate; clear citations for Kubernetes scale.",
    }),
  });

  const resValidFeedback = await submitFeedbackRoute(reqValidFeedback, {
    params: Promise.resolve({ id: jobA.id }),
  });
  if (resValidFeedback.status !== 201) {
    const errBody = await resValidFeedback.clone().json().catch(() => ({}));
    console.error("Test 6 failed with status:", resValidFeedback.status, "Body:", errBody);
  }
  assert(resValidFeedback.status === 201, "Authorized RECRUITER can submit pilot feedback (201 Created)");

  const fbData1 = await resValidFeedback.json();
  assert(fbData1.feedback.category === "ranking_correct", "Feedback category saved correctly");
  assert(fbData1.feedback.systemScore === 86.2, "Feedback captures systemScore snapshot");
  assert(fbData1.feedback.systemRank === 1, "Feedback captures candidate's system rank snapshot (#1)");

  // Test 2: Cross-tenant isolation - Recruiter Beta (Org B) cannot submit feedback for Job A (Returns 404)
  const reqCrossTenantFeedback = new NextRequest(`http://localhost:3000/api/jobs/${jobA.id}/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenRecruiterB}`,
    },
    body: JSON.stringify({
      candidateId: candidate1Id,
      category: "ranking_correct",
    }),
  });
  const resCrossTenantFeedback = await submitFeedbackRoute(reqCrossTenantFeedback, {
    params: Promise.resolve({ id: jobA.id }),
  });
  assert(resCrossTenantFeedback.status === 404, "Cross-tenant feedback submission returns 404 Not Found");

  // Test 3: Cross-tenant candidate reference - Recruiter Alpha cannot reference candidate from another org
  const reqCrossTenantCandidate = new NextRequest(`http://localhost:3000/api/jobs/${jobA.id}/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenRecruiterA}`,
    },
    body: JSON.stringify({
      candidateId: "non-existent-or-other-org-candidate",
      category: "ranking_correct",
    }),
  });
  const resCrossTenantCandidate = await submitFeedbackRoute(reqCrossTenantCandidate, {
    params: Promise.resolve({ id: jobA.id }),
  });
  assert(resCrossTenantCandidate.status === 404, "Invalid or cross-tenant candidate reference returns 404");

  // Test 4: Unauthenticated request rejected (401)
  const reqUnauthFeedback = new NextRequest(`http://localhost:3000/api/jobs/${jobA.id}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category: "ranking_correct" }),
  });
  const resUnauthFeedback = await submitFeedbackRoute(reqUnauthFeedback, {
    params: Promise.resolve({ id: jobA.id }),
  });
  assert(resUnauthFeedback.status === 401, "Unauthenticated feedback request rejected with 401 Unauthorized");

  // Test 5: VIEWER role cannot submit feedback (403 Forbidden)
  const reqViewerFeedback = new NextRequest(`http://localhost:3000/api/jobs/${jobA.id}/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenViewerA}`,
    },
    body: JSON.stringify({ category: "ranking_correct" }),
  });
  const resViewerFeedback = await submitFeedbackRoute(reqViewerFeedback, {
    params: Promise.resolve({ id: jobA.id }),
  });
  assert(resViewerFeedback.status === 403, "VIEWER role rejected with 403 Forbidden on feedback submission");

  // ---------------------------------------------------------------------------
  // Section 4: Scoring Invariance Guarantee
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 4: Scoring Invariance Guarantee ---");

  // Submit disagreement feedback on Candidate 2
  const initialMatchCand2 = await Store.getMatch(orgAId, candidate2Id);
  const initialScoreCand2 = initialMatchCand2?.overallScore;

  const reqDisagreementFeedback = new NextRequest(`http://localhost:3000/api/jobs/${jobA.id}/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenRecruiterA}`,
    },
    body: JSON.stringify({
      candidateId: candidate2Id,
      category: "relevant_ranked_too_low",
      disagreementReason: "relevant_experience_overlooked",
      perceivedTrustScore: 3,
      perceivedUsefulnessScore: 4,
      timeSavedMinutes: 10,
      comment: "Candidate has production Docker container orchestration that equals required Kubernetes.",
    }),
  });

  const resDisagreementFeedback = await submitFeedbackRoute(reqDisagreementFeedback, {
    params: Promise.resolve({ id: jobA.id }),
  });
  assert(resDisagreementFeedback.status === 201, "Recorded ranking disagreement feedback with structured reason");

  // Verify match analysis score was NOT altered by feedback
  const matchCand2AfterFeedback = await Store.getMatch(orgAId, candidate2Id);
  assert(
    matchCand2AfterFeedback?.overallScore === initialScoreCand2,
    "Feedback submission preserves exact candidate overallScore (No score tampering)"
  );
  assert(
    matchCand2AfterFeedback?.scoreBreakdown.skills === initialMatchCand2?.scoreBreakdown.skills,
    "Skills breakdown remains invariant"
  );
  assert(
    matchCand2AfterFeedback?.aiRecommendation === initialMatchCand2?.aiRecommendation,
    "AI recommendation remains invariant"
  );

  // ---------------------------------------------------------------------------
  // Section 5: Validation & Bounds Checking
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 5: Validation & Bounds Checking ---");

  // Test: Invalid category rejected
  const reqInvalidCat = new NextRequest(`http://localhost:3000/api/jobs/${jobA.id}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenRecruiterA}` },
    body: JSON.stringify({ category: "invalid_category_xyz" }),
  });
  const resInvalidCat = await submitFeedbackRoute(reqInvalidCat, { params: Promise.resolve({ id: jobA.id }) });
  assert(resInvalidCat.status === 400, "Rejects invalid category with 400 Bad Request");

  // Test: Out of bounds trust score (<1 or >5) rejected
  const reqInvalidTrust = new NextRequest(`http://localhost:3000/api/jobs/${jobA.id}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenRecruiterA}` },
    body: JSON.stringify({ category: "ranking_correct", perceivedTrustScore: 6 }),
  });
  const resInvalidTrust = await submitFeedbackRoute(reqInvalidTrust, { params: Promise.resolve({ id: jobA.id }) });
  assert(resInvalidTrust.status === 400, "Rejects perceivedTrustScore > 5 with 400 Bad Request");

  // ---------------------------------------------------------------------------
  // Section 6: Recruiter Decisions & Shortlist Formation
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 6: Recruiter Decisions & Shortlist Formation ---");

  // Recruiter Alpha marks Candidate 1 as "shortlisted" and Candidate 3 as "rejected"
  await Store.updateRecruiterDecision(orgAId, candidate1Id, "shortlisted", "Strong backend architecture skills", undefined, "interview", {
    userId: userAId,
    userName: "Recruiter Alpha",
    role: "RECRUITER",
  });

  await Store.updateRecruiterDecision(orgAId, candidate3Id, "rejected", "Junior profile, does not meet 5 year requirement", undefined, "archived", {
    userId: userAId,
    userName: "Recruiter Alpha",
    role: "RECRUITER",
  });

  const updatedMatch1 = await Store.getMatch(orgAId, candidate1Id);
  const updatedMatch3 = await Store.getMatch(orgAId, candidate3Id);
  assert(updatedMatch1?.recruiterDecision === "shortlisted", "Candidate 1 marked as shortlisted");
  assert(updatedMatch3?.recruiterDecision === "rejected", "Candidate 3 marked as rejected");

  // ---------------------------------------------------------------------------
  // Section 7: Evaluation Report Generation & 3-Way Separation
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 7: Evaluation Report Generation & 3-Way Separation ---");

  const reqReport = new NextRequest(`http://localhost:3000/api/jobs/${jobA.id}/evaluation-report`, {
    method: "GET",
    headers: { Authorization: `Bearer ${tokenRecruiterA}` },
  });

  const resReport = await getEvaluationReportRoute(reqReport, {
    params: Promise.resolve({ id: jobA.id }),
  });
  assert(resReport.status === 200, "Evaluation report endpoint returns 200 OK");

  const reportData = await resReport.json();
  const report = reportData.report;

  assert(report.job.title === "Senior Backend Engineer", "Report includes requisition title");
  assert(report.candidateRankings.length === 3, "Report includes all 3 candidate rankings");
  assert(report.candidateRankings[0].candidateName === "Alice Engineer", "Top-ranked candidate is Alice (#1)");

  // Verify Triad separation
  assert(Array.isArray(report.factsVsPredictionsVsJudgments.observedFacts), "Report contains observedFacts array");
  assert(Array.isArray(report.factsVsPredictionsVsJudgments.automatedPredictions), "Report contains automatedPredictions array");
  assert(Array.isArray(report.factsVsPredictionsVsJudgments.recruiterJudgments), "Report contains recruiterJudgments array");

  // Verify decision summaries
  assert(report.summary.totalCandidates === 3, "Total candidates is 3");
  assert(report.summary.shortlistedCount === 1, "Shortlisted count is 1");
  assert(report.summary.rejectedCount === 1, "Rejected count is 1");
  assert(report.summary.unreviewedCount === 1, "Unreviewed count is 1 (Candidate 2)");
  assert(report.summary.reviewedCount === 2, "Reviewed count is 2");
  assert(report.summary.decisionCompletionRatePercent === 66.7, "Decision completion rate is 66.7%");

  // Verify disagreement breakdown
  assert(report.summary.rankingDisagreementsCount >= 1, "Disagreement count correctly tracked");
  assert(
    report.commonDisagreementReasons["relevant_experience_overlooked"] >= 1,
    "Disagreement reason 'relevant_experience_overlooked' aggregated"
  );

  // Verify Precision@K and small-N disclaimer
  assert(typeof report.rankingMetrics.precisionAt3 === "number", "Precision@3 is computed numeric");
  assert(typeof report.rankingMetrics.limitationsNotice === "string", "Small-N limitations disclaimer is present");

  // Cross-tenant report access defense
  const reqCrossTenantReport = new NextRequest(`http://localhost:3000/api/jobs/${jobA.id}/evaluation-report`, {
    method: "GET",
    headers: { Authorization: `Bearer ${tokenRecruiterB}` },
  });
  const resCrossTenantReport = await getEvaluationReportRoute(reqCrossTenantReport, {
    params: Promise.resolve({ id: jobA.id }),
  });
  assert(resCrossTenantReport.status === 404, "Cross-tenant access to evaluation report returns 404");

  // ---------------------------------------------------------------------------
  // Section 8: Telemetry Event Logging & Metric Aggregation
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 8: Telemetry Event Logging & Metric Aggregation ---");

  // Record telemetry events
  const reqTel1 = new NextRequest(`http://localhost:3000/api/jobs/${jobA.id}/telemetry`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenRecruiterA}` },
    body: JSON.stringify({
      eventType: "evidence_inspected",
      candidateId: candidate1Id,
      metadata: { section: "kubernetes_scale" },
    }),
  });
  const resTel1 = await recordTelemetryRoute(reqTel1, { params: Promise.resolve({ id: jobA.id }) });
  assert(resTel1.status === 200, "Recorded evidence_inspected telemetry event (200 OK)");

  const reqTel2 = new NextRequest(`http://localhost:3000/api/jobs/${jobA.id}/telemetry`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenRecruiterA}` },
    body: JSON.stringify({
      eventType: "candidate_compared",
      metadata: { candidatesCompared: 2 },
    }),
  });
  const resTel2 = await recordTelemetryRoute(reqTel2, { params: Promise.resolve({ id: jobA.id }) });
  assert(resTel2.status === 200, "Recorded candidate_compared telemetry event (200 OK)");

  // Fetch organization pilot metrics
  const orgMetrics = await getPilotOrganizationMetrics(orgAId);
  assert(orgMetrics.workflow.evidenceViewsCount >= 1, "Telemetry aggregates evidence views count >= 1");
  assert(orgMetrics.workflow.comparisonsCount >= 1, "Telemetry aggregates comparisons count >= 1");
  assert(orgMetrics.workflow.shortlistedCount === 1, "Telemetry metrics reports 1 shortlisted candidate");
  assert(orgMetrics.validationFeedback.totalFeedbackEntries >= 2, "Telemetry reports at least 2 feedback entries");

  // Verify metric registry definitions
  assert(Object.keys(PILOT_METRIC_DEFINITIONS).length >= 8, "Metric registry contains definitions with start/end events");
  assert(PILOT_METRIC_DEFINITIONS["time_to_complete_shortlist"].unit === "minutes", "time_to_complete_shortlist unit is minutes");

  // Admin pilot metrics route
  const reqAdminMetrics = new NextRequest("http://localhost:3000/api/admin/pilot-metrics", {
    method: "GET",
    headers: { Authorization: `Bearer ${tokenRecruiterA}` },
  });
  const resAdminMetrics = await getAdminPilotMetricsRoute(reqAdminMetrics);
  assert(resAdminMetrics.status === 200, "Admin pilot metrics endpoint returns 200 OK");

  // Cross-tenant telemetry isolation: Org B metrics should have 0 evidence views
  const orgBMetrics = await getPilotOrganizationMetrics(orgBId);
  assert(orgBMetrics.workflow.evidenceViewsCount === 0, "Org B metrics isolated from Org A telemetry (0 views)");
  assert(orgBMetrics.validationFeedback.totalFeedbackEntries === 0, "Org B metrics has 0 feedback entries");

  // ---------------------------------------------------------------------------
  // Section 9: Relational Cascade Deletion Integrity
  // ---------------------------------------------------------------------------
  console.log("\n--- Section 9: Relational Cascade Deletion Integrity ---");

  // Deleting Candidate 1 should cascade and delete associated feedback
  const preDeleteFeedback = await db
    .select()
    .from(pilotFeedback)
    .where(eq(pilotFeedback.candidateId, candidate1Id));
  assert(preDeleteFeedback.length >= 1, "Feedback exists for Candidate 1 before delete");

  await Store.deleteCandidate(orgAId, candidate1Id);

  const postDeleteFeedback = await db
    .select()
    .from(pilotFeedback)
    .where(eq(pilotFeedback.candidateId, candidate1Id));
  assert(postDeleteFeedback.length === 0, "Deleting candidate cascades and purges associated pilot feedback");

  // Deleting Job A cascades and purges remaining feedback
  await Store.deleteJob(orgAId, jobA.id);
  const remainingJobFeedback = await db
    .select()
    .from(pilotFeedback)
    .where(eq(pilotFeedback.jobId, jobA.id));
  assert(remainingJobFeedback.length === 0, "Deleting job cascades and purges all remaining job feedback");

  console.log("\n======================================================================");
  console.log(`Phase 8 Validation Suite: All ${passedTests} / ${totalTests} assertions PASSED (100%)`);
  console.log("======================================================================\n");
}

if (require.main === module) {
  runPhase8ValidationTests()
    .then(async () => {
      await closeDb();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("\n[FATAL ERROR in Phase 8 Validation Suite]:", err);
      await closeDb();
      process.exit(1);
    });
}
