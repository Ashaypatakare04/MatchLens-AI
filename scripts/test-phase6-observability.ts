/**
 * MatchLens AI - Phase 6 Automated Test Suite: Observability, Health & Operational Recovery
 * 
 * Verifies:
 * 1. Structured logging output and mandatory redaction rules.
 * 2. Protection against log injection and sensitive data leakage.
 * 3. Request correlation ID validation and generation.
 * 4. /api/healthz liveness probe contract and latency.
 * 5. /api/readyz readiness probe contract and bounded dependency verification.
 * 6. Background queue and worker metrics collection.
 * 7. Administrative monitoring RBAC and token security.
 * 8. Automated stale job recovery and idempotent recovery procedures.
 */

import crypto from "crypto";
import { logger, extractOrGenerateRequestId } from "../lib/logger";
import { redactSensitiveData, sanitizeString, validateRequestId } from "../lib/logger/redact";
import { getQueueSystemMetrics } from "../lib/observability/metrics";
import { Store } from "../lib/storage/store";
import { getDb, closeDb } from "../lib/db";
import { organizations, users, jobs, resumeDocuments, processingJobs } from "../lib/db/schema";
import { createTestAuthToken } from "../lib/auth/session";

// Import Next.js route handlers
import { GET as healthzGet } from "../app/api/healthz/route";
import { GET as readyzGet } from "../app/api/readyz/route";
import { GET as monitoringGet } from "../app/api/admin/monitoring/route";
import { POST as recoveryPost } from "../app/api/admin/recovery/route";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    passedCount++;
    console.log(`[ PASS ] ${testName}`);
    if (details) console.log(`         Details: ${details}`);
  } else {
    failedCount++;
    console.error(`[ FAIL ] ${testName}`);
    if (details) console.error(`         Details: ${details}`);
  }
}

async function runObservabilityTests() {
  console.log("================================================================================");
  console.log("       MATCHLENS AI - PHASE 6 OBSERVABILITY, LOGGING & RECOVERY SUITE           ");
  console.log("================================================================================\n");

  // ---------------------------------------------------------------------------
  // 1. Log Redaction & Sanitization Tests
  // ---------------------------------------------------------------------------
  console.log("--- TEST GROUP 1: Central Log Redaction & Log-Injection Defense ---");

  const sensitivePayload = {
    password: "SuperSecretPassword123!",
    passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz",
    jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignature",
    authorization: "Bearer secret-token-xyz-123456",
    database_url: "postgresql://postgres:myDbPassword@db.production.internal:5432/matchlens",
    redis_url: "redis://default:redisSecret@cache.internal:6379",
    s3_secret_access_key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    s3_access_key_id: "AKIAIOSFODNN7EXAMPLE",
    raw_text: "Confidential candidate resume content: Jane Doe, 555-0199, SSN 000-11-2222",
    extracted_text: "Work history at Secret Corp from 2020 to 2024",
    signed_url: "https://matchlens.ai/api/storage/download?token=hmac-secret-signature-12345",
    safeField: "Frontend Developer",
    numberField: 42,
  };

  const redacted = redactSensitiveData(sensitivePayload) as Record<string, unknown>;

  assert(redacted.password === "[REDACTED]", "Redacts raw passwords in object context");
  assert(redacted.passwordHash === "[REDACTED]", "Redacts password hashes");
  assert(redacted.jwt === "[REDACTED]", "Redacts JWT tokens in object properties");
  assert(redacted.authorization === "[REDACTED]", "Redacts Authorization headers");
  assert(redacted.database_url === "[REDACTED]", "Redacts database connection strings");
  assert(redacted.redis_url === "[REDACTED]", "Redacts Redis URLs");
  assert(redacted.s3_secret_access_key === "[REDACTED]", "Redacts S3 / R2 secret keys");
  assert(redacted.s3_access_key_id === "[REDACTED]", "Redacts S3 access key IDs");
  assert(redacted.raw_text === "[REDACTED]", "Redacts raw candidate resume text");
  assert(redacted.extracted_text === "[REDACTED]", "Redacts extracted resume text");
  assert(redacted.signed_url === "[REDACTED]", "Redacts HMAC signed download URLs");
  assert(redacted.safeField === "Frontend Developer", "Preserves non-sensitive operational metadata");
  assert(redacted.numberField === 42, "Preserves numeric values");

  // String inline pattern scrubbing
  const logStringWithBearer = "User authorized with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.xyz";
  const scrubbedString = sanitizeString(logStringWithBearer);
  assert(!scrubbedString.includes("eyJhbGci"), "Scans and scrubs embedded JWTs from prose strings", scrubbedString);

  const dbLogString = "Connecting to postgresql://user:myPass123@localhost:5432/db";
  const scrubbedDb = sanitizeString(dbLogString);
  assert(!scrubbedDb.includes("myPass123"), "Scans and scrubs connection credentials in log strings", scrubbedDb);

  // Log injection defense (newline carriage return escaping)
  const logInjectionAttempt = "Normal message\r\n{\"level\":\"info\",\"message\":\"FORGED_LOG_ENTRY\"}";
  const loggedEntry = logger.info(logInjectionAttempt);
  assert(loggedEntry !== undefined && !loggedEntry.message.includes("\r\n"), "Escapes carriage returns and newlines to prevent log forging");

  // ---------------------------------------------------------------------------
  // 2. Request Correlation & Context Propagation Tests
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 2: Request Correlation & Request ID Validation ---");

  // Valid Request ID
  assert(validateRequestId("req-valid-uuid-12345") === "req-valid-uuid-12345", "Validates compliant Request ID format");
  assert(validateRequestId("trace_987654321-abc") === "trace_987654321-abc", "Accepts alphanumeric, underscores, and hyphens");

  // Malicious / Invalid Request IDs
  assert(validateRequestId("req-invalid with spaces") === null, "Rejects Request IDs with spaces");
  assert(validateRequestId("req-injection\r\nHeader: value") === null, "Rejects Request IDs with newline injection");
  assert(validateRequestId("req-" + "a".repeat(100)) === null, "Rejects Request IDs exceeding maximum length limit (64 chars)");
  assert(validateRequestId("<script>alert(1)</script>") === null, "Rejects Request IDs with HTML/XSS characters");

  // Generator fallback
  const dummyReqWithoutId = new Request("http://localhost:3000/api/healthz");
  const extractedGenerated = extractOrGenerateRequestId(dummyReqWithoutId);
  assert(extractedGenerated.isGenerated === true && extractedGenerated.requestId.startsWith("req-"), "Generates cryptographically secure UUID when Request ID is absent");

  const dummyReqWithValidId = new Request("http://localhost:3000/api/healthz", {
    headers: { "x-request-id": "client-trace-12345" },
  });
  const extractedExisting = extractOrGenerateRequestId(dummyReqWithValidId);
  assert(extractedExisting.isGenerated === false && extractedExisting.requestId === "client-trace-12345", "Preserves and extracts verified client Request ID");

  // Child logger correlation
  const childLogger = logger.child({
    requestId: "req-child-123",
    orgId: "org-test-child",
    jobId: "job-test-child",
  });
  const childEntry = childLogger.info("Child log test", { stage: "extracting" });
  assert(childEntry?.requestId === "req-child-123", "Child logger propagates bound requestId");
  assert(childEntry?.orgId === "org-test-child", "Child logger propagates bound orgId");
  assert(childEntry?.jobId === "job-test-child", "Child logger propagates bound jobId");

  // ---------------------------------------------------------------------------
  // 3. Health & Readiness Endpoints Tests
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 3: Health & Readiness Probe Endpoints ---");

  // /api/healthz liveness probe
  const healthzReq = new Request("http://localhost:3000/api/healthz", {
    headers: { "x-request-id": "probe-liveness-001" },
  });
  const startHealthz = Date.now();
  const healthzRes = await healthzGet(healthzReq);
  const healthzDuration = Date.now() - startHealthz;
  const healthzData = await healthzRes.json();

  assert(healthzRes.status === 200, "Liveness endpoint (/api/healthz) returns HTTP 200 OK");
  assert(healthzData.status === "ok", "Liveness response body confirms status: ok");
  assert(healthzRes.headers.get("x-request-id") === "probe-liveness-001", "Liveness probe mirrors x-request-id header");
  assert(healthzDuration < 50, "Liveness probe execution is ultra-lightweight (<50ms)", `${healthzDuration}ms`);
  assert(JSON.stringify(healthzData).indexOf("password") === -1, "Liveness probe contains zero secrets or credentials");

  // /api/readyz readiness probe
  const readyzReq = new Request("http://localhost:3000/api/readyz", {
    headers: { "x-request-id": "probe-readiness-001" },
  });
  const readyzRes = await readyzGet(readyzReq);
  const readyzData = await readyzRes.json();

  assert(readyzRes.status === 200, "Readiness endpoint (/api/readyz) returns HTTP 200 when backing services are healthy");
  assert(readyzData.status === "ready", "Readiness response body reports ready");
  assert(readyzData.checks.database === "healthy", "Readiness confirms database connectivity");
  assert(readyzData.checks.storage === "healthy", "Readiness confirms storage service connectivity");
  assert(readyzRes.headers.get("x-request-id") === "probe-readiness-001", "Readiness probe mirrors x-request-id header");
  assert(!JSON.stringify(readyzData).includes("postgres://"), "Readiness probe never exposes database connection strings");

  // ---------------------------------------------------------------------------
  // 4. Monitoring Metrics & Queue Observability Tests
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 4: Queue Metrics & Monitoring API ---");

  const queueMetrics = await getQueueSystemMetrics();
  assert(typeof queueMetrics.jobs.queuedCount === "number", "Queue metrics reports queuedCount as numeric");
  assert(typeof queueMetrics.jobs.processingCount === "number", "Queue metrics reports processingCount as numeric");
  assert(typeof queueMetrics.jobs.retryRatePercent === "number", "Queue metrics reports retryRatePercent");
  assert(typeof queueMetrics.outbox.backlogCount === "number", "Queue metrics reports outbox backlog count");
  assert(["healthy", "congested", "critical"].includes(queueMetrics.outbox.status), "Outbox health classification is valid", queueMetrics.outbox.status);
  assert(["healthy", "idle", "stale", "unhealthy"].includes(queueMetrics.worker.status), "Worker health status classification is valid", queueMetrics.worker.status);

  // Setup test org and users for auth testing
  const db = await getDb();
  const testOrgId = `org-obs-${crypto.randomBytes(4).toString("hex")}`;
  const testAdminId = `user-admin-${crypto.randomBytes(4).toString("hex")}`;
  const testRecruiterId = `user-rec-${crypto.randomBytes(4).toString("hex")}`;
  const now = new Date();

  await db.insert(organizations).values({
    id: testOrgId,
    name: "Observability Test Org",
    slug: `obs-org-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(users).values([
    {
      id: testAdminId,
      organizationId: testOrgId,
      name: "Admin SRE",
      email: `admin-${Date.now()}@matchlens.test`,
      passwordHash: "hash",
      role: "ADMIN",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: testRecruiterId,
      organizationId: testOrgId,
      name: "Recruiter User",
      email: `recruiter-${Date.now()}@matchlens.test`,
      passwordHash: "hash",
      role: "RECRUITER",
      createdAt: now,
      updatedAt: now,
    },
  ]);

  const adminToken = createTestAuthToken({ userId: testAdminId });
  const recruiterToken = createTestAuthToken({ userId: testRecruiterId });

  // /api/admin/monitoring unauthorized test
  const unauthMonitorReq = new Request("http://localhost:3000/api/admin/monitoring");
  const unauthMonitorRes = await monitoringGet(unauthMonitorReq);
  assert(unauthMonitorRes.status === 403, "Unauthenticated request to /api/admin/monitoring returns HTTP 403 Forbidden");

  // Non-admin role rejected
  const recruiterMonitorReq = new Request("http://localhost:3000/api/admin/monitoring", {
    headers: { Authorization: `Bearer ${recruiterToken}` },
  });
  const recruiterMonitorRes = await monitoringGet(recruiterMonitorReq);
  assert(recruiterMonitorRes.status === 403, "Non-admin user (RECRUITER) rejected from /api/admin/monitoring with 403");

  // Admin role accepted
  const adminMonitorReq = new Request("http://localhost:3000/api/admin/monitoring", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminMonitorRes = await monitoringGet(adminMonitorReq);
  assert(adminMonitorRes.status === 200, "Admin user successfully retrieves monitoring metrics (HTTP 200)");
  const adminMonitorData = await adminMonitorRes.json();
  assert(adminMonitorData.worker !== undefined && adminMonitorData.jobs !== undefined, "Admin monitoring response contains structured queue and worker sections");

  // Monitoring API Key authentication
  process.env.MONITORING_API_KEY = "test-monitoring-secret-key-123";
  const apiKeyMonitorReq = new Request("http://localhost:3000/api/admin/monitoring", {
    headers: { Authorization: "Bearer test-monitoring-secret-key-123" },
  });
  const apiKeyMonitorRes = await monitoringGet(apiKeyMonitorReq);
  assert(apiKeyMonitorRes.status === 200, "Monitoring agent authenticates with MONITORING_API_KEY Bearer token");
  delete process.env.MONITORING_API_KEY;

  // ---------------------------------------------------------------------------
  // 5. Automated Stale Job Recovery & Operational Recovery Tests
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 5: Operational Recovery & Heartbeat Expiration ---");

  // Create a test job and document to simulate a crashed worker
  const testJobId = `job-obs-${crypto.randomBytes(4).toString("hex")}`;
  const testDocId = `doc-obs-${crypto.randomBytes(4).toString("hex")}`;
  const testStalePjobId = `pjob-stale-${crypto.randomBytes(4).toString("hex")}`;
  const testExpiredPjobId = `pjob-expired-${crypto.randomBytes(4).toString("hex")}`;

  await db.insert(jobs).values({
    id: testJobId,
    organizationId: testOrgId,
    title: "SRE Test Engineer",
    company: "MatchLens Systems",
    location: "Remote",
    rawDescription: "SRE test role description",
    requirements: {
      requiredSkills: ["TypeScript", "Docker"],
      preferredSkills: [],
      minExperienceYears: 3,
      educationRequirement: "Bachelor's",
      importantKeywords: ["SRE", "Observability"],
      keyResponsibilities: ["Maintain cluster reliability"],
      requirementsList: ["TypeScript proficiency"],
    },
    weights: { skills: 0.3, experience: 0.3, education: 0.1, projects: 0.15, responsibilities: 0.15 },
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(resumeDocuments).values({
    id: testDocId,
    organizationId: testOrgId,
    jobId: testJobId,
    storageKey: `resumes/${testOrgId}/${testJobId}/cand-test/doc-test.pdf`,
    fileName: "candidate_resume.pdf",
    fileHash: "hash-obs-001",
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  // Stale job that has remaining attempts (attempts: 1, maxAttempts: 3)
  await db.insert(processingJobs).values({
    id: testStalePjobId,
    organizationId: testOrgId,
    jobId: testJobId,
    documentId: testDocId,
    fileName: "candidate_resume.pdf",
    fileHash: "hash-obs-001",
    status: "PROCESSING",
    currentStage: "extracting",
    progress: 25,
    attempts: 1,
    maxAttempts: 3,
    idempotencyKey: `idem-stale-${Date.now()}`,
    heartbeatAt: tenMinutesAgo,
    createdAt: tenMinutesAgo,
    updatedAt: tenMinutesAgo,
  });

  // Expired job that has reached maxAttempts (attempts: 3, maxAttempts: 3)
  await db.insert(processingJobs).values({
    id: testExpiredPjobId,
    organizationId: testOrgId,
    jobId: testJobId,
    documentId: testDocId,
    fileName: "candidate_resume.pdf",
    fileHash: "hash-obs-002",
    status: "PROCESSING",
    currentStage: "normalizing",
    progress: 50,
    attempts: 3,
    maxAttempts: 3,
    idempotencyKey: `idem-expired-${Date.now()}`,
    heartbeatAt: tenMinutesAgo,
    createdAt: tenMinutesAgo,
    updatedAt: tenMinutesAgo,
  });

  // Run recovery via Store
  const recoveryResult = await Store.recoverStaleProcessingJobs(5 * 60 * 1000);
  assert(recoveryResult.recoveredCount >= 1, "Recovers crashed jobs with remaining attempts back to QUEUED status");
  assert(recoveryResult.failedCount >= 1, "Transitions expired jobs with exhausted attempts to FAILED status");

  const staleJobAfter = await Store.getProcessingJob(testOrgId, testStalePjobId);
  assert(staleJobAfter?.status === "QUEUED" && staleJobAfter?.progress === 0, "Recovered stale job is reset to QUEUED with progress 0");

  const expiredJobAfter = await Store.getProcessingJob(testOrgId, testExpiredPjobId);
  assert(expiredJobAfter?.status === "FAILED" && expiredJobAfter?.errorCode === "WORKER_TIMEOUT", "Expired job is marked FAILED with WORKER_TIMEOUT");

  // Idempotency: Running recovery again immediately should not re-modify records
  const idempotencyCheck = await Store.recoverStaleProcessingJobs(5 * 60 * 1000);
  assert(idempotencyCheck.recoveredCount === 0 && idempotencyCheck.failedCount === 0, "Recovery procedure is strictly idempotent (zero re-modifications on immediate second run)");

  // Admin Recovery API endpoint test
  const adminRecoveryReq = new Request("http://localhost:3000/api/admin/recovery", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "recover_stale_jobs" }),
  });
  const adminRecoveryRes = await recoveryPost(adminRecoveryReq);
  assert(adminRecoveryRes.status === 200, "Admin Recovery API executes recover_stale_jobs successfully");
  const adminRecoveryData = await adminRecoveryRes.json();
  assert(adminRecoveryData.success === true && typeof adminRecoveryData.recoveredCount === "number", "Admin Recovery response reports structured recovery summary");

  // Non-admin user blocked from recovery API
  const recruiterRecoveryReq = new Request("http://localhost:3000/api/admin/recovery", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${recruiterToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "recover_stale_jobs" }),
  });
  const recruiterRecoveryRes = await recoveryPost(recruiterRecoveryReq);
  assert(recruiterRecoveryRes.status === 403, "Non-admin user blocked from /api/admin/recovery with 403 Forbidden");

  // Purged document retry protection test
  const purgedDocId = `doc-purged-${crypto.randomBytes(4).toString("hex")}`;
  const purgedPjobId = `pjob-purged-${crypto.randomBytes(4).toString("hex")}`;

  await db.insert(resumeDocuments).values({
    id: purgedDocId,
    organizationId: testOrgId,
    jobId: testJobId,
    storageKey: `resumes/${testOrgId}/${testJobId}/cand-test/doc-purged.pdf`,
    fileName: "purged_resume.pdf",
    fileHash: "hash-purged-001",
    status: "purged", // PURGED
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(processingJobs).values({
    id: purgedPjobId,
    organizationId: testOrgId,
    jobId: testJobId,
    documentId: purgedDocId,
    fileName: "purged_resume.pdf",
    fileHash: "hash-purged-001",
    status: "FAILED",
    currentStage: "failed",
    progress: 0,
    attempts: 1,
    maxAttempts: 3,
    idempotencyKey: `idem-purged-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  });

  const retryPurgedResult = await Store.retryProcessingJob(testOrgId, purgedPjobId);
  assert(retryPurgedResult === null, "Rejects manual retry of jobs whose underlying resume document has been purged for compliance");

  await closeDb();

  console.log("\n================================================================================");
  console.log("PHASE 6 OBSERVABILITY & RECOVERY TEST SUMMARY:");
  console.log(`Total Tests Run : ${passedCount + failedCount}`);
  console.log(`Passed          : ${passedCount}`);
  console.log(`Failed          : ${failedCount}`);
  console.log(`All Passed      : ${failedCount === 0}`);
  console.log("================================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runObservabilityTests().catch((err) => {
  console.error("Fatal error in observability test suite:", err);
  process.exit(1);
});
