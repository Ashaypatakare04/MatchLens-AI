/**
 * MatchLens AI - Phase 2 Multi-Tenant Isolation & Authentication Test Suite
 * 
 * Verifies:
 * 1. Unauthenticated request rejection (401 Unauthorized).
 * 2. Same-tenant CRUD operations for authorized members (200/201).
 * 3. Cross-tenant read protection / non-disclosing 404s (IDOR / BOLA prevention).
 * 4. Cross-tenant mutation protection (PUT/PATCH/DELETE return 404, data unchanged).
 * 5. Client parameter tampering / spoofing resistance (cannot spoof organizationId).
 * 6. Multi-tenant audit log strict filtering & isolation.
 * 7. Role-Based Access Control (RBAC: ADMIN vs RECRUITER vs VIEWER).
 * 8. Direct database repository layer tenant boundary enforcement.
 */

import { NextRequest } from "next/server";
import { getDb, closeDb } from "../lib/db";
import { organizations, users } from "../lib/db/schema";
import { Store } from "../lib/storage/store";
import { createTestAuthToken } from "../lib/auth/session";
import { Job, CandidateProfile, MatchAnalysis } from "../lib/types";
import { DEFAULT_WEIGHTS } from "../lib/extractor/job-extractor";

// Import Route Handlers
import { GET as getJobs, POST as postJobs } from "../app/api/jobs/route";
import { GET as getJob, PUT as putJob, DELETE as deleteJob } from "../app/api/jobs/[id]/route";
import { GET as getCandidates } from "../app/api/jobs/[id]/candidates/route";
import {
  GET as getCandidate,
  PATCH as patchCandidate,
} from "../app/api/jobs/[id]/candidates/[candidateId]/route";
import { GET as exportCandidate } from "../app/api/jobs/[id]/candidates/[candidateId]/export/route";
import { POST as rescoreJob } from "../app/api/jobs/[id]/rescore/route";
import { GET as getAuditLog } from "../app/api/audit-log/route";

function makeRequest(
  url: string,
  method: string = "GET",
  token?: string,
  body?: unknown,
  extraHeaders?: Record<string, string>
): NextRequest {
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (body) {
    headers.set("Content-Type", "application/json");
  }
  if (extraHeaders) {
    for (const [k, v] of Object.entries(extraHeaders)) {
      headers.set(k, v);
    }
  }

  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

async function runTenantIsolationTests() {
  console.log("================================================================================");
  console.log("    MATCHLENS AI - PHASE 2 MULTI-TENANT ISOLATION & AUTH VERIFICATION SUITE     ");
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

  const db = await getDb();
  const now = new Date();

  // ---------------------------------------------------------------------------
  // FIXTURES SETUP
  // ---------------------------------------------------------------------------
  console.log("--- Setting up Multi-Tenant Fixtures ---");

  const orgAId = `org-alpha-${Date.now()}`;
  const orgBId = `org-beta-${Date.now()}`;

  await db.insert(organizations).values([
    {
      id: orgAId,
      name: "Alpha Corp Recruiting",
      slug: `alpha-corp-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: orgBId,
      name: "Beta Dynamics Talent",
      slug: `beta-dynamics-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  const userA_Recruiter = {
    id: `user-a-rec-${Date.now()}`,
    organizationId: orgAId,
    email: `recruiter@alpha-${Date.now()}.internal`,
    name: "Alice Recruiter (Alpha)",
    role: "RECRUITER" as const,
  };

  const userA_Admin = {
    id: `user-a-adm-${Date.now()}`,
    organizationId: orgAId,
    email: `admin@alpha-${Date.now()}.internal`,
    name: "Alex Admin (Alpha)",
    role: "ADMIN" as const,
  };

  const userA_Viewer = {
    id: `user-a-view-${Date.now()}`,
    organizationId: orgAId,
    email: `viewer@alpha-${Date.now()}.internal`,
    name: "Arthur Viewer (Alpha)",
    role: "VIEWER" as const,
  };

  const userB_Recruiter = {
    id: `user-b-rec-${Date.now()}`,
    organizationId: orgBId,
    email: `recruiter@beta-${Date.now()}.internal`,
    name: "Bob Recruiter (Beta)",
    role: "RECRUITER" as const,
  };

  await db.insert(users).values([
    { ...userA_Recruiter, createdAt: now, updatedAt: now },
    { ...userA_Admin, createdAt: now, updatedAt: now },
    { ...userA_Viewer, createdAt: now, updatedAt: now },
    { ...userB_Recruiter, createdAt: now, updatedAt: now },
  ]);

  const tokenA_Rec = createTestAuthToken({ userId: userA_Recruiter.id });
  const tokenA_Adm = createTestAuthToken({ userId: userA_Admin.id });
  const tokenA_View = createTestAuthToken({ userId: userA_Viewer.id });
  const tokenB_Rec = createTestAuthToken({ userId: userB_Recruiter.id });

  console.log(`Created Org Alpha (${orgAId}) with Recruiter, Admin, and Viewer.`);
  console.log(`Created Org Beta (${orgBId}) with Recruiter.\n`);

  // ---------------------------------------------------------------------------
  // TEST 1: Unauthenticated Requests Rejection
  // ---------------------------------------------------------------------------
  console.log("--- TEST 1: Unauthenticated Requests Rejection (401 Unauthorized) ---");

  const unauthGetRes = await getJobs(makeRequest("/api/jobs"));
  assert(
    unauthGetRes.status === 401,
    "Unauthenticated GET /api/jobs returns 401",
    `Status received: ${unauthGetRes.status} (expected 401)`
  );

  const unauthPostRes = await postJobs(
    makeRequest("/api/jobs", "POST", undefined, { title: "Unauth Job", rawDescription: "Test" })
  );
  assert(
    unauthPostRes.status === 401,
    "Unauthenticated POST /api/jobs returns 401",
    `Status received: ${unauthPostRes.status} (expected 401)`
  );

  const invalidTokenRes = await getJobs(makeRequest("/api/jobs", "GET", "invalid.token.signature"));
  assert(
    invalidTokenRes.status === 401,
    "Forged/Tampered Token returns 401",
    `Status received: ${invalidTokenRes.status} (expected 401)`
  );

  // ---------------------------------------------------------------------------
  // TEST 2: Authorized Tenant A Job & Candidate Creation
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 2: Authorized Same-Tenant Operations (Org Alpha) ---");

  const createJobRes = await postJobs(
    makeRequest("/api/jobs", "POST", tokenA_Rec, {
      title: "Alpha Senior Backend Engineer",
      company: "Alpha Corp",
      location: "San Francisco, CA",
      workMode: "Hybrid",
      employmentType: "Full-time",
      rawDescription: "Seeking Senior Go/Rust engineer with distributed systems and PostgreSQL expertise.",
    })
  );

  assert(
    createJobRes.status === 201,
    "User A1 creates Job in Org Alpha (201 Created)",
    `Status received: ${createJobRes.status}`
  );

  const jobAData = await createJobRes.json();
  const jobAId = jobAData.job.id;

  const getJobARes = await getJob(
    makeRequest(`/api/jobs/${jobAId}`, "GET", tokenA_Rec),
    { params: Promise.resolve({ id: jobAId }) }
  );
  const getJobAJson = await getJobARes.json();

  assert(
    getJobARes.status === 200 && getJobAJson.job.id === jobAId,
    "User A1 retrieves Job A (200 OK)",
    `Retrieved job title: "${getJobAJson.job.title}"`
  );

  // Seed Candidate A in Org Alpha directly using Store
  const candAId = `cand-alpha-${Date.now()}`;
  const candA: CandidateProfile = {
    id: candAId,
    jobId: jobAId,
    name: "Alice Alpha Candidate",
    email: "alice@alpha-candidate.org",
    phone: "+1-555-0100",
    location: "San Francisco, CA",
    education: [],
    totalExperienceYears: 7,
    workHistory: [],
    skills: ["Go", "Rust", "PostgreSQL", "Distributed Systems"],
    certifications: [],
    projects: [],
    achievements: [],
    rawResumeText: "Go & Rust backend systems architect.",
    fileName: "alice_resume.pdf",
    fileType: "pdf",
    fileSize: 50000,
    fileHash: `hash-alpha-${Date.now()}`,
    parsingConfidence: "high",
    parsingWarnings: [],
    extractedAt: now.toISOString(),
  };

  const matchA: MatchAnalysis = {
    candidateId: candAId,
    jobId: jobAId,
    overallScore: 94,
    scoreBreakdown: { skills: 96, experience: 92, education: 85, projects: 90, responsibilities: 95 },
    weightedContributions: { skills: 33.6, experience: 23.0, education: 8.5, projects: 13.5, responsibilities: 14.25 },
    skillsAnalysis: { requiredMatched: [], requiredMissing: [], preferredMatched: [], preferredMissing: [], transferableSkills: [], score: 96 },
    experienceAnalysis: { score: 92, totalYearsDetected: 7, relevantExperienceYears: 7, requiredYears: 5, status: "exceeds", relevantRoles: [], evidence: "7 yrs" },
    educationAnalysis: { score: 85, meetsRequirement: true, degreeMatch: "B.S. Computer Science", evidence: "BS" },
    projectAnalysis: { score: 90, relevantProjects: [], evidence: "Distributed systems" },
    responsibilityAlignment: [],
    strongMatches: ["Go", "Rust"],
    missingRequirements: [],
    potentialInconsistencies: [],
    evidenceLog: [],
    aiRecommendation: "Strong Match",
    aiExplanation: "Exemplary systems engineering tenure.",
    recruiterDecision: "unreviewed",
    recruiterNotes: "",
    pipelineStage: "screening",
    analyzedAt: now.toISOString(),
  };

  await Store.saveCandidateWithMatch(orgAId, candA, matchA);

  const getCandARes = await getCandidate(
    makeRequest(`/api/jobs/${jobAId}/candidates/${candAId}`, "GET", tokenA_Rec),
    { params: Promise.resolve({ id: jobAId, candidateId: candAId }) }
  );
  assert(
    getCandARes.status === 200,
    "User A1 retrieves Candidate A (200 OK)",
    `Candidate retrieved with status: ${getCandARes.status}`
  );

  // ---------------------------------------------------------------------------
  // TEST 3: Cross-Tenant Read Protection (IDOR / BOLA Prevention)
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 3: Cross-Tenant Read Isolation (Org Beta vs Org Alpha) ---");

  // User B attempts to read Job A
  const userBGetJobARes = await getJob(
    makeRequest(`/api/jobs/${jobAId}`, "GET", tokenB_Rec),
    { params: Promise.resolve({ id: jobAId }) }
  );
  assert(
    userBGetJobARes.status === 404,
    "User B1 cannot read Job A (Returns Non-Disclosing 404)",
    `Status received: ${userBGetJobARes.status} (prevents tenant job enumeration)`
  );

  // User B lists jobs
  const userBListJobsRes = await getJobs(makeRequest("/api/jobs", "GET", tokenB_Rec));
  const userBListJobsJson = await userBListJobsRes.json();
  const containsJobA = userBListJobsJson.jobs?.some((j: Job) => j.id === jobAId);
  assert(
    !containsJobA,
    "User B1 job list contains zero jobs from Org Alpha",
    `Org Beta jobs returned: ${userBListJobsJson.jobs?.length || 0}`
  );

  // User B attempts to list candidates of Job A
  const userBListCandRes = await getCandidates(
    makeRequest(`/api/jobs/${jobAId}/candidates`, "GET", tokenB_Rec),
    { params: Promise.resolve({ id: jobAId }) }
  );
  assert(
    userBListCandRes.status === 404,
    "User B1 cannot list candidates for Job A (Returns 404)",
    `Status received: ${userBListCandRes.status}`
  );

  // User B attempts to fetch Candidate A directly by ID
  const userBGetCandARes = await getCandidate(
    makeRequest(`/api/jobs/${jobAId}/candidates/${candAId}`, "GET", tokenB_Rec),
    { params: Promise.resolve({ id: jobAId, candidateId: candAId }) }
  );
  assert(
    userBGetCandARes.status === 404,
    "User B1 cannot read Candidate A by direct ID guessing (Returns 404)",
    `Status received: ${userBGetCandARes.status}`
  );

  // User B attempts to export Candidate A
  const userBExportCandARes = await exportCandidate(
    makeRequest(`/api/jobs/${jobAId}/candidates/${candAId}/export`, "GET", tokenB_Rec),
    { params: Promise.resolve({ id: jobAId, candidateId: candAId }) }
  );
  assert(
    userBExportCandARes.status === 404,
    "User B1 cannot export Candidate A data (Returns 404)",
    `Status received: ${userBExportCandARes.status}`
  );

  // ---------------------------------------------------------------------------
  // TEST 4: Cross-Tenant Mutation & Destruction Protection
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 4: Cross-Tenant Mutation & Destruction Protection ---");

  // User B attempts to overwrite Job A title
  const userBPutJobARes = await putJob(
    makeRequest(`/api/jobs/${jobAId}`, "PUT", tokenB_Rec, { title: "Hacked Title" }),
    { params: Promise.resolve({ id: jobAId }) }
  );
  assert(
    userBPutJobARes.status === 404,
    "User B1 cannot update Job A (Returns 404)",
    `Status received: ${userBPutJobARes.status}`
  );

  const jobACheck = await Store.getJob(orgAId, jobAId);
  assert(
    jobACheck?.title === "Alpha Senior Backend Engineer",
    "Job A title remained completely unchanged in database",
    `Current title: "${jobACheck?.title}"`
  );

  // User B attempts to delete Job A
  const userBDeleteJobARes = await deleteJob(
    makeRequest(`/api/jobs/${jobAId}`, "DELETE", tokenB_Rec),
    { params: Promise.resolve({ id: jobAId }) }
  );
  assert(
    userBDeleteJobARes.status === 404,
    "User B1 cannot delete Job A (Returns 404)",
    `Status received: ${userBDeleteJobARes.status}`
  );

  // User B attempts to alter Candidate A recruiter decision
  const userBPatchCandRes = await patchCandidate(
    makeRequest(`/api/jobs/${jobAId}/candidates/${candAId}`, "PATCH", tokenB_Rec, {
      decision: "rejected",
      notes: "Malicious cross-tenant override attempt",
    }),
    { params: Promise.resolve({ id: jobAId, candidateId: candAId }) }
  );
  assert(
    userBPatchCandRes.status === 404,
    "User B1 cannot alter Candidate A decision (Returns 404)",
    `Status received: ${userBPatchCandRes.status}`
  );

  const matchACheck = await Store.getMatch(orgAId, candAId);
  assert(
    matchACheck?.recruiterDecision === "unreviewed",
    "Candidate A decision remained intact as 'unreviewed'",
    `Current decision: "${matchACheck?.recruiterDecision}"`
  );

  // User B attempts to trigger rescore on Job A
  const userBRescoreRes = await rescoreJob(
    makeRequest(`/api/jobs/${jobAId}/rescore`, "POST", tokenB_Rec, {
      weights: { ...DEFAULT_WEIGHTS, skills: 50 },
    }),
    { params: Promise.resolve({ id: jobAId }) }
  );
  assert(
    userBRescoreRes.status === 404,
    "User B1 cannot trigger rescore on Job A (Returns 404)",
    `Status received: ${userBRescoreRes.status}`
  );

  // ---------------------------------------------------------------------------
  // TEST 5: Parameter Tampering & Spoofing Resistance
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 5: Client Parameter Spoofing Resistance ---");

  // User B attempts to pass organizationId: orgAId in body to create a job in Org Alpha
  const spoofedJobRes = await postJobs(
    makeRequest("/api/jobs", "POST", tokenB_Rec, {
      title: "Spoofed Job Org A",
      company: "Sneaky Infiltration",
      rawDescription: "Attempting to insert into Org A via client body injection.",
      organizationId: orgAId,
    }, {
      "X-Organization-Id": orgAId,
    })
  );

  assert(
    spoofedJobRes.status === 201,
    "Job created successfully under User B session",
    `Status: ${spoofedJobRes.status}`
  );

  const spoofedJobJson = await spoofedJobRes.json();
  const spoofedJobId = spoofedJobJson.job.id;

  // Verify the job was saved under Org Beta, NOT Org Alpha
  const checkJobInOrgA = await Store.getJob(orgAId, spoofedJobId);
  const checkJobInOrgB = await Store.getJob(orgBId, spoofedJobId);

  assert(
    checkJobInOrgA === null && checkJobInOrgB !== null,
    "Client organizationId override was strictly ignored (Saved to Org Beta)",
    `Visible in Org A: ${checkJobInOrgA !== null}, Visible in Org B: ${checkJobInOrgB !== null}`
  );

  // ---------------------------------------------------------------------------
  // TEST 6: Audit Log Multi-Tenant Isolation
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 6: Audit Log Isolation ---");

  // User A updates decision on Candidate A to generate an audit log event
  await patchCandidate(
    makeRequest(`/api/jobs/${jobAId}/candidates/${candAId}`, "PATCH", tokenA_Rec, {
      decision: "shortlisted",
      notes: "Approved by Alpha recruiter.",
    }),
    { params: Promise.resolve({ id: jobAId, candidateId: candAId }) }
  );

  // User A reads audit log
  const userAAuditRes = await getAuditLog(makeRequest("/api/audit-log", "GET", tokenA_Rec));
  const userAAuditJson = await userAAuditRes.json();
  const orgAEvents = userAAuditJson.events?.filter((e: { organizationId?: string }) => e.organizationId === orgAId);

  assert(
    orgAEvents && orgAEvents.length >= 1,
    "User A1 can retrieve Org Alpha audit events",
    `Retrieved ${orgAEvents?.length} events for Org Alpha.`
  );

  // User B reads audit log
  const userBAuditRes = await getAuditLog(makeRequest("/api/audit-log", "GET", tokenB_Rec));
  const userBAuditJson = await userBAuditRes.json();
  const leakedEventsFromOrgA = userBAuditJson.events?.filter((e: { organizationId?: string }) => e.organizationId === orgAId);

  assert(
    !leakedEventsFromOrgA || leakedEventsFromOrgA.length === 0,
    "User B1 audit log query strictly isolates and leaks 0 events from Org Alpha",
    `Leaked events from Org Alpha to User B: ${leakedEventsFromOrgA?.length || 0}`
  );

  // ---------------------------------------------------------------------------
  // TEST 7: Role-Based Access Control (RBAC)
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 7: Role-Based Access Control (RBAC) ---");

  // Viewer can read Job A
  const viewerGetJobRes = await getJob(
    makeRequest(`/api/jobs/${jobAId}`, "GET", tokenA_View),
    { params: Promise.resolve({ id: jobAId }) }
  );
  assert(
    viewerGetJobRes.status === 200,
    "Viewer can read Job A (200 OK)",
    `Status received: ${viewerGetJobRes.status}`
  );

  // Viewer CANNOT create a new job
  const viewerPostJobRes = await postJobs(
    makeRequest("/api/jobs", "POST", tokenA_View, {
      title: "Viewer Job",
      rawDescription: "Should be blocked.",
    })
  );
  assert(
    viewerPostJobRes.status === 403,
    "Viewer cannot create jobs (Returns 403 Forbidden)",
    `Status received: ${viewerPostJobRes.status}`
  );

  // Viewer CANNOT delete Job A
  const viewerDeleteJobRes = await deleteJob(
    makeRequest(`/api/jobs/${jobAId}`, "DELETE", tokenA_View),
    { params: Promise.resolve({ id: jobAId }) }
  );
  assert(
    viewerDeleteJobRes.status === 403,
    "Viewer cannot delete jobs (Returns 403 Forbidden)",
    `Status received: ${viewerDeleteJobRes.status}`
  );

  // Viewer CANNOT update recruiter decision
  const viewerPatchDecisionRes = await patchCandidate(
    makeRequest(`/api/jobs/${jobAId}/candidates/${candAId}`, "PATCH", tokenA_View, {
      decision: "hired",
      notes: "Viewer attempt to hire",
    }),
    { params: Promise.resolve({ id: jobAId, candidateId: candAId }) }
  );
  assert(
    viewerPatchDecisionRes.status === 403,
    "Viewer cannot modify recruiter decisions (Returns 403 Forbidden)",
    `Status received: ${viewerPatchDecisionRes.status}`
  );

  // Recruiter CANNOT call admin-only demo seed in production mode
  const originalEnv = process.env.NODE_ENV;
  (process.env as Record<string, string | undefined>)["NODE_ENV"] = "production";
  const seedModule = await import("../app/api/demo/seed/route");
  const recruiterSeedRes = await seedModule.POST(makeRequest("/api/demo/seed", "POST", tokenA_Rec));
  (process.env as Record<string, string | undefined>)["NODE_ENV"] = originalEnv;

  assert(
    recruiterSeedRes.status === 403,
    "Recruiter cannot execute admin-only operations in production (Returns 403 Forbidden)",
    `Status received: ${recruiterSeedRes.status}`
  );

  // ---------------------------------------------------------------------------
  // TEST 8: Direct Persistence Layer Tenant Boundary Verification
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 8: Direct Repository Layer Tenant Isolation ---");

  const directJobCheck = await Store.getJob(orgBId, jobAId);
  assert(
    directJobCheck === null,
    "Store.getJob strictly checks organizationId (returns null for Org B)",
    `Direct fetch result: ${directJobCheck}`
  );

  const directCandCheck = await Store.getCandidate(orgBId, candAId);
  assert(
    directCandCheck === null,
    "Store.getCandidate strictly checks organizationId (returns null for Org B)",
    `Direct candidate fetch result: ${directCandCheck}`
  );

  const directMatchCheck = await Store.getMatch(orgBId, candAId);
  assert(
    directMatchCheck === null,
    "Store.getMatch strictly checks organizationId (returns null for Org B)",
    `Direct match fetch result: ${directMatchCheck}`
  );

  let crossOrgSaveFailed = false;
  try {
    // Attempt to save candidate to Job A under Org B
    await Store.saveCandidateWithMatch(orgBId, { ...candA, id: "cross-cand" }, matchA);
  } catch {
    crossOrgSaveFailed = true;
  }
  assert(
    crossOrgSaveFailed,
    "Store.saveCandidateWithMatch prevents saving candidate if job not in organization",
    "Cross-tenant candidate save aborted as expected."
  );

  const directDeleteCheck = await Store.deleteJob(orgBId, jobAId);
  assert(
    directDeleteCheck === false,
    "Store.deleteJob returns false when target job does not belong to organization",
    `Delete result: ${directDeleteCheck}`
  );

  // Cleanup: Admin deletes Job A in Org Alpha
  const adminDeleteJobRes = await deleteJob(
    makeRequest(`/api/jobs/${jobAId}`, "DELETE", tokenA_Adm),
    { params: Promise.resolve({ id: jobAId }) }
  );
  assert(
    adminDeleteJobRes.status === 200,
    "Admin can delete Job A (Cascades candidate and analysis)",
    `Status: ${adminDeleteJobRes.status}`
  );

  console.log("\n================================================================================");
  console.log("PHASE 2 TENANT ISOLATION TEST SUMMARY:");
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

runTenantIsolationTests().catch((err) => {
  console.error("FATAL ERROR in Phase 2 Tenant Isolation test suite:", err);
  process.exit(1);
});
