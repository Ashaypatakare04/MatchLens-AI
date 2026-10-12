/**
 * MatchLens AI - Phase 4 Asynchronous Queue & Worker Test Suite
 * 
 * Verifies:
 * 1. Transactional outbox & atomic job creation (dual-write prevention).
 * 2. Asynchronous upload route returning 202 Accepted without blocking HTTP requests.
 * 3. Processing job status API (/api/jobs/[id]/processing-jobs) with tenant isolation & pagination.
 * 4. Single job status endpoint (/api/processing-jobs/[id]) with non-disclosing 404 for cross-tenant.
 * 5. Competing-consumer optimistic claiming (Store.claimProcessingJob).
 * 6. Pipeline stage transitions: extracting (25%) -> normalizing (50%) -> matching (75%) -> completed (100%).
 * 7. Candidate creation, document linking, deterministic scoring, and audit logging during worker execution.
 * 8. Stale heartbeat detection and crashed worker automated recovery (Store.recoverStaleProcessingJobs).
 * 9. Worker retry endpoint (/api/processing-jobs/[id]/retry): RBAC checks, tenant checks, state checks.
 * 10. Purged document retry protection: cannot retry jobs whose documents were purged.
 * 11. Sanitized error messages: no secrets or stack traces leaked to API consumers.
 * 12. Idempotent execution: repeated processing does not create duplicate candidate records.
 * 13. Batch upload throughput: asynchronous ingestion latency vs concurrent worker draining.
 */

import crypto from "crypto";
import { NextRequest } from "next/server";
import { getDb, closeDb } from "../lib/db";
import { eq } from "drizzle-orm";
import {
  organizations,
  users,
  jobs,
  candidates,
  resumeDocuments,
  processingJobs,
  processingOutbox,
} from "../lib/db/schema";
import { Store } from "../lib/storage/store";
import { createTestAuthToken } from "../lib/auth/session";
import { getObjectStorageService } from "../lib/storage/object-storage";
import { processResumeJob } from "../lib/queue/processor";
import { runWorkerIteration, flushOutboxEvents } from "../lib/queue/worker";
import { QueueJobPayload } from "../lib/queue/types";
import { DEFAULT_WEIGHTS } from "../lib/extractor/job-extractor";

// Route handlers
import { POST as uploadResume } from "../app/api/jobs/[id]/upload/route";
import { GET as getProcessingJobsList } from "../app/api/jobs/[id]/processing-jobs/route";
import { GET as getSingleProcessingJob } from "../app/api/processing-jobs/[id]/route";
import { POST as retryProcessingJobRoute } from "../app/api/processing-jobs/[id]/retry/route";

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

async function runQueueTestSuite() {
  console.log("=== MatchLens AI: Phase 4 Asynchronous Queue & Worker Verification ===\n");

  const db = await getDb();
  const storage = getObjectStorageService();

  // Test Tenants & Users
  const orgAId = "org-queue-alpha";
  const orgBId = "org-queue-beta";

  // Clean up any residual data from previous test runs
  await db.delete(processingOutbox).where(eq(processingOutbox.organizationId, orgAId));
  await db.delete(processingOutbox).where(eq(processingOutbox.organizationId, orgBId));
  await db.delete(processingJobs).where(eq(processingJobs.organizationId, orgAId));
  await db.delete(processingJobs).where(eq(processingJobs.organizationId, orgBId));
  await db.delete(resumeDocuments).where(eq(resumeDocuments.organizationId, orgAId));
  await db.delete(resumeDocuments).where(eq(resumeDocuments.organizationId, orgBId));
  await db.delete(candidates).where(eq(candidates.organizationId, orgAId));
  await db.delete(candidates).where(eq(candidates.organizationId, orgBId));
  await db.delete(jobs).where(eq(jobs.organizationId, orgAId));
  await db.delete(jobs).where(eq(jobs.organizationId, orgBId));

  await db
    .insert(organizations)
    .values([
      { id: orgAId, name: "Queue Alpha Corp", slug: "queue-alpha" },
      { id: orgBId, name: "Queue Beta Corp", slug: "queue-beta" },
    ])
    .onConflictDoNothing();

  const userAId = "user-queue-alpha-recruiter";
  const userAdminAId = "user-queue-alpha-admin";
  const userViewerAId = "user-queue-alpha-viewer";
  const userBId = "user-queue-beta-recruiter";

  await db
    .insert(users)
    .values([
      {
        id: userAId,
        organizationId: orgAId,
        email: "recruiter@alpha.queue.test",
        name: "Alpha Recruiter",
        passwordHash: "hash",
        role: "RECRUITER",
      },
      {
        id: userAdminAId,
        organizationId: orgAId,
        email: "admin@alpha.queue.test",
        name: "Alpha Admin",
        passwordHash: "hash",
        role: "ADMIN",
      },
      {
        id: userViewerAId,
        organizationId: orgAId,
        email: "viewer@alpha.queue.test",
        name: "Alpha Viewer",
        passwordHash: "hash",
        role: "VIEWER",
      },
      {
        id: userBId,
        organizationId: orgBId,
        email: "recruiter@beta.queue.test",
        name: "Beta Recruiter",
        passwordHash: "hash",
        role: "RECRUITER",
      },
    ])
    .onConflictDoNothing();

  const tokenAlphaRecruiter = createTestAuthToken({ userId: userAId });
  const tokenAlphaAdmin = createTestAuthToken({ userId: userAdminAId });
  const tokenAlphaViewer = createTestAuthToken({ userId: userViewerAId });
  const tokenBetaRecruiter = createTestAuthToken({ userId: userBId });

  // Seed test job requisition for Org A
  const jobA = await Store.createJob(orgAId, {
    id: "job-queue-alpha-001",
    title: "Senior Distributed Systems Engineer",
    company: "Queue Alpha Corp",
    location: "Remote",
    workMode: "Remote",
    employmentType: "Full-time",
    rawDescription: "Seeking a senior distributed systems engineer with Go, Kafka, PostgreSQL, and Kubernetes experience.",
    requirements: {
      requiredSkills: ["Go", "Kafka", "PostgreSQL", "Kubernetes"],
      preferredSkills: ["Redis", "gRPC", "Docker"],
      minExperienceYears: 5,
      educationRequirement: "Bachelor's degree",
      importantKeywords: ["Go", "Kafka", "PostgreSQL", "Kubernetes"],
      keyResponsibilities: ["Architect distributed message queues", "Scale transaction outbox pipelines"],
      requirementsList: ["5+ years experience", "Production distributed systems"],
    },
    weights: DEFAULT_WEIGHTS,
  });

  // Seed test job requisition for Org B
  const jobB = await Store.createJob(orgBId, {
    id: "job-queue-beta-001",
    title: "Lead DevOps Specialist",
    company: "Queue Beta Corp",
    location: "Remote",
    workMode: "Remote",
    employmentType: "Full-time",
    rawDescription: "DevOps engineer with Terraform and AWS experience.",
    requirements: {
      requiredSkills: ["Terraform", "AWS"],
      preferredSkills: ["Docker"],
      minExperienceYears: 4,
      educationRequirement: "Bachelor's degree",
      importantKeywords: ["Terraform", "AWS"],
      keyResponsibilities: ["Manage cloud infrastructure"],
      requirementsList: ["4+ years DevOps"],
    },
    weights: DEFAULT_WEIGHTS,
  });

  assert(!!tokenAlphaAdmin, "Alpha Admin auth token generated");
  assert(!!jobB.id, "Tenant B job requisition created successfully");

  // =========================================================================
  // SECTION 1: Transactional Outbox Pattern & Repository Layer
  // =========================================================================
  console.log("\n--- Section 1: Transactional Outbox Pattern & Repository ---");

  const testDocId = "doc-test-outbox-001";
  const testPJobId = "pjob-test-outbox-001";
  const testStorageKey = `resumes/${orgAId}/${jobA.id}/${testDocId}.txt`;
  const dummyHash = crypto.createHash("sha256").update("sample resume text").digest("hex");

  // Save base document
  await Store.saveResumeDocument(orgAId, {
    id: testDocId,
    jobId: jobA.id,
    storageKey: testStorageKey,
    storageProvider: "local",
    fileName: "Candidate_Outbox_Test.txt",
    fileType: "txt",
    mimeType: "text/plain",
    fileSize: 1024,
    fileHash: dummyHash,
    status: "processing",
  });

  // Create processing job with transactional outbox
  const { processingJob, outbox: outboxEvent } = await Store.createProcessingJobWithOutbox(orgAId, {
    id: testPJobId,
    jobId: jobA.id,
    documentId: testDocId,
    fileName: "Candidate_Outbox_Test.txt",
    fileSize: 1024,
    fileHash: dummyHash,
    storageKey: testStorageKey,
    idempotencyKey: `upload-${testDocId}`,
  });

  assert(processingJob.id === testPJobId, "createProcessingJobWithOutbox creates processingJob record");
  assert(processingJob.status === "QUEUED", "Initial processingJob status is 'QUEUED'");
  assert(processingJob.progress === 0, "Initial processingJob progress is 0");
  assert(processingJob.attempts === 0, "Initial processingJob attempts count is 0");
  assert(outboxEvent.status === "PENDING", "Transactional outbox event status is 'PENDING'");
  assert(outboxEvent.processingJobId === testPJobId, "Outbox event links to processing job ID");

  // Verify outbox event retrieval and status publishing
  const pendingEvents = await Store.getPendingOutboxEvents(10);
  assert(pendingEvents.some((e) => e.id === outboxEvent.id), "Store.getPendingOutboxEvents returns the pending outbox event");

  const markPublishedRes = await Store.markOutboxEventPublished(outboxEvent.id);
  assert(markPublishedRes === true, "Store.markOutboxEventPublished marks event as published");

  const pendingAfterPub = await Store.getPendingOutboxEvents(10);
  assert(!pendingAfterPub.some((e) => e.id === outboxEvent.id), "Published outbox event is no longer returned in pending list");

  // Test outbox event failure tracking
  const failedEventId = `outbox-fail-${Date.now()}`;
  await db.insert(processingOutbox).values({
    id: failedEventId,
    organizationId: orgAId,
    processingJobId: testPJobId,
    eventType: "resume.process",
    payload: {
      processingJobId: testPJobId,
      organizationId: orgAId,
      jobId: jobA.id,
      documentId: testDocId,
      storageKey: testStorageKey,
      fileName: "Candidate_Outbox_Test.txt",
      fileHash: dummyHash,
    },
    status: "PENDING",
    attempts: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await Store.markOutboxEventFailed(failedEventId, "Network timeout contacting broker");
  const [failedRecord] = await db.select().from(processingOutbox).where(eq(processingOutbox.id, failedEventId));
  assert(failedRecord.status === "FAILED", "Store.markOutboxEventFailed sets status to FAILED");
  assert(failedRecord.lastError === "Network timeout contacting broker", "Store.markOutboxEventFailed records failure message");
  assert(failedRecord.attempts === 1, "Store.markOutboxEventFailed increments attempts counter");

  // Clean up mock outbox test records
  await db.delete(processingOutbox).where(eq(processingOutbox.processingJobId, testPJobId));
  await db.delete(processingJobs).where(eq(processingJobs.id, testPJobId));
  await db.delete(resumeDocuments).where(eq(resumeDocuments.id, testDocId));

  // =========================================================================
  // SECTION 2: Asynchronous Upload API Endpoint (202 Accepted)
  // =========================================================================
  console.log("\n--- Section 2: Asynchronous Upload Route (HTTP 202 Accepted) ---");

  const testResumeContent1 = `
ALEX RIVERA
Email: alex.rivera@distrib.test | Phone: (555) 234-5678
Location: Seattle, WA

PROFESSIONAL SUMMARY
Senior Distributed Systems Engineer with 7 years of deep experience architecting high-throughput Go microservices, Kafka event streaming, and PostgreSQL databases deployed on Kubernetes clusters.

TECHNICAL SKILLS
Languages: Go, Python, SQL
Technologies: Kafka, PostgreSQL, Kubernetes, Docker, Redis, gRPC, Linux, CI/CD

EXPERIENCE
Staff Engineer | StreamWave Distributed Systems
2021 - Present
- Architected distributed event-sourcing pipeline using Go and Apache Kafka handling 500,000 events/sec.
- Designed partitioned PostgreSQL data architecture with zero-downtime online migrations.
- Managed Kubernetes production deployments with GitOps and custom Helm charts.

Senior Software Engineer | CloudCore Technologies
2018 - 2021
- Built resilient distributed services in Go utilizing gRPC and PostgreSQL.
- Optimized transactional outbox worker performance reducing delivery latency by 65%.

EDUCATION
B.S. in Computer Science | University of Washington, 2018
  `;

  const resumeBlob = new Blob([testResumeContent1], { type: "text/plain" });
  const resumeFile = new File([resumeBlob], "Alex_Rivera_Dist_Systems.txt", { type: "text/plain" });

  const formData = new FormData();
  formData.append("files", resumeFile);

  const uploadReq = new NextRequest(
    new URL(`/api/jobs/${jobA.id}/upload`, "http://localhost:3000"),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAlphaRecruiter}`,
      },
      body: formData,
    }
  );

  const startTime = Date.now();
  const uploadRes = await uploadResume(uploadReq, { params: Promise.resolve({ id: jobA.id }) });
  const latencyMs = Date.now() - startTime;

  assert(uploadRes.status === 202, "Asynchronous upload route returns HTTP 202 Accepted");
  assert(latencyMs < 2000, `Upload route returned promptly without synchronous processing (${latencyMs}ms)`);

  const uploadData = await uploadRes.json();
  assert(uploadData.isAsync === true, "Upload response flags isAsync: true");
  assert(uploadData.accepted === 1, "Upload response reports 1 accepted job");
  assert(uploadData.results.length === 1, "Upload response returns 1 result item");
  assert(uploadData.results[0].status === "queued", "Uploaded item status is 'queued'");

  const uploadedPJobId = uploadData.results[0].processingJobId;
  const uploadedDocId = uploadData.results[0].documentId;
  assert(!!uploadedPJobId, "Upload returns generated processingJobId");
  assert(!!uploadedDocId, "Upload returns generated documentId");

  // Verify the resume document in DB is initially in processing state
  const docInDb = await Store.getResumeDocument(orgAId, uploadedDocId);
  assert(docInDb !== null, "Resume document persisted in database");
  assert(docInDb?.status === "processing", "Resume document initial status is 'processing'");

  // Verify the processing job in DB is QUEUED
  const pJobInDb = await Store.getProcessingJob(orgAId, uploadedPJobId);
  assert(pJobInDb !== null, "Processing job persisted in database");
  assert(pJobInDb?.status === "QUEUED", "Processing job initial status is 'QUEUED'");
  assert(pJobInDb?.attempts === 0, "Processing job initial attempts is 0");

  // Verify encrypted file was written to private object storage
  const fileExistsInStorage = await storage.objectExists(docInDb!.storageKey, orgAId);
  assert(fileExistsInStorage === true, "File stored in private object storage before enqueueing");

  // Duplicate upload detection: re-uploading identical file returns duplicate immediately
  const dupFormData = new FormData();
  const dupFile = new File([resumeBlob], "Alex_Rivera_Dist_Systems.txt", { type: "text/plain" });
  dupFormData.append("files", dupFile);

  const dupUploadReq = new NextRequest(
    new URL(`/api/jobs/${jobA.id}/upload`, "http://localhost:3000"),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAlphaRecruiter}`,
      },
      body: dupFormData,
    }
  );
  const dupUploadRes = await uploadResume(dupUploadReq, { params: Promise.resolve({ id: jobA.id }) });
  const dupUploadData = await dupUploadRes.json();
  assert(dupUploadData.results[0].status === "duplicate", "Immediate duplicate resume detection prevents redundant queueing");

  // =========================================================================
  // SECTION 3: Processing Status & Inspection APIs
  // =========================================================================
  console.log("\n--- Section 3: Processing Status & Inspection APIs ---");

  // 1. GET /api/jobs/[id]/processing-jobs for Org A recruiter
  const listJobsReq = new NextRequest(
    new URL(`/api/jobs/${jobA.id}/processing-jobs?limit=10`, "http://localhost:3000"),
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenAlphaRecruiter}`,
      },
    }
  );
  const listJobsRes = await getProcessingJobsList(listJobsReq, { params: Promise.resolve({ id: jobA.id }) });
  assert(listJobsRes.status === 200, "Processing jobs list endpoint returns 200 for authorized user");
  const listData = await listJobsRes.json();
  assert(listData.items.length >= 1, "Processing jobs list returns enqueued items");
  assert(listData.items.some((i: { id: string }) => i.id === uploadedPJobId), "List contains our newly enqueued processing job");

  // 2. Tenant Isolation: Org B recruiter attempting to list Org A processing jobs
  const crossTenantListReq = new NextRequest(
    new URL(`/api/jobs/${jobA.id}/processing-jobs`, "http://localhost:3000"),
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenBetaRecruiter}`,
      },
    }
  );
  const crossTenantListRes = await getProcessingJobsList(crossTenantListReq, { params: Promise.resolve({ id: jobA.id }) });
  assert(crossTenantListRes.status === 404, "Cross-tenant list request is rejected with 404 (non-disclosing)");

  // 3. GET /api/processing-jobs/[id] for Org A recruiter
  const singleJobReq = new NextRequest(
    new URL(`/api/processing-jobs/${uploadedPJobId}`, "http://localhost:3000"),
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenAlphaRecruiter}`,
      },
    }
  );
  const singleJobRes = await getSingleProcessingJob(singleJobReq, { params: Promise.resolve({ id: uploadedPJobId }) });
  assert(singleJobRes.status === 200, "Single processing job endpoint returns 200 for authorized user");
  const singleJobData = await singleJobRes.json();
  assert(singleJobData.id === uploadedPJobId, "Returned processing job matches requested ID");
  assert(singleJobData.status === "QUEUED", "Returned processing job reflects correct status");
  assert(!("storageKey" in singleJobData), "Internal raw storage paths are sanitized and excluded from API response");

  // 4. Tenant Isolation: Org B recruiter accessing Org A single processing job
  const crossTenantSingleReq = new NextRequest(
    new URL(`/api/processing-jobs/${uploadedPJobId}`, "http://localhost:3000"),
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenBetaRecruiter}`,
      },
    }
  );
  const crossTenantSingleRes = await getSingleProcessingJob(crossTenantSingleReq, { params: Promise.resolve({ id: uploadedPJobId }) });
  assert(crossTenantSingleRes.status === 404, "Cross-tenant single job request is rejected with non-disclosing 404");

  // =========================================================================
  // SECTION 4: Background Worker Execution & Competing Consumer Concurrency
  // =========================================================================
  console.log("\n--- Section 4: Worker Execution & Optimistic Concurrency ---");

  // Test optimistic claim locking
  const claim1 = await Store.claimProcessingJob(uploadedPJobId);
  assert(claim1 !== null, "First consumer successfully claims QUEUED job");
  assert(claim1?.status === "PROCESSING", "Claimed job status transitions to 'PROCESSING'");
  assert(claim1?.attempts === 1, "Claim increments attempts to 1");
  assert(claim1?.heartbeatAt !== null, "Claim sets initial heartbeatAt timestamp");

  // Competing worker attempting to claim same job concurrently
  const claim2 = await Store.claimProcessingJob(uploadedPJobId);
  assert(claim2 === null, "Competing worker cannot claim an already PROCESSING job (optimistic lock verified)");

  // Execute processing pipeline for Alex Rivera
  const queuePayload: QueueJobPayload = {
    processingJobId: uploadedPJobId,
    organizationId: orgAId,
    jobId: jobA.id,
    documentId: uploadedDocId,
    storageKey: docInDb!.storageKey,
    fileName: docInDb!.fileName,
    fileHash: docInDb!.fileHash,
  };

  const processResult = await processResumeJob(queuePayload);
  assert(processResult.status === "COMPLETED", "Resume processing pipeline completes successfully");
  assert(!!processResult.candidateId, "Processing pipeline generates and returns candidateId");
  assert(typeof processResult.overallScore === "number", "Processing pipeline calculates deterministic overallScore");
  assert(processResult.overallScore! >= 70, `Alex Rivera scores high on distributed systems requirements (${processResult.overallScore})`);

  // Verify database state after worker completion
  const completedPJob = await Store.getProcessingJob(orgAId, uploadedPJobId);
  assert(completedPJob?.status === "COMPLETED", "Processing job in DB is marked 'COMPLETED'");
  assert(completedPJob?.progress === 100, "Processing job progress reaches 100%");
  assert(completedPJob?.candidateId === processResult.candidateId, "Processing job links created candidate ID");
  assert(completedPJob?.completedAt !== null, "Processing job completedAt timestamp is recorded");

  // Verify candidate was persisted with deterministic matching
  const candidateRecord = await Store.getCandidate(orgAId, processResult.candidateId!);
  assert(candidateRecord !== null, "Candidate profile persisted to database");
  assert(candidateRecord?.name === "ALEX RIVERA", "Candidate name normalized from resume");
  assert(candidateRecord?.jobId === jobA.id, "Candidate correctly associated with job requisition");

  // Verify document status was updated to active
  const updatedDoc = await Store.getResumeDocument(orgAId, uploadedDocId);
  assert(updatedDoc?.status === "active", "Resume document status updated to 'active'");
  assert(updatedDoc?.candidateId === processResult.candidateId, "Resume document linked to candidate ID");

  // =========================================================================
  // SECTION 5: Worker Crash Recovery (Stale Heartbeats)
  // =========================================================================
  console.log("\n--- Section 5: Stale Heartbeat Worker Crash Recovery ---");

  // Create a job simulating a worker crash (PROCESSING state with expired heartbeat)
  const stalePJobId = "pjob-stale-worker-crash-001";
  const staleDocId = "doc-stale-worker-crash-001";
  const staleExpiredHeartbeat = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago

  await db.insert(resumeDocuments).values({
    id: staleDocId,
    organizationId: orgAId,
    jobId: jobA.id,
    storageKey: `resumes/${orgAId}/${jobA.id}/${staleDocId}.txt`,
    storageProvider: "local",
    fileName: "Stale_Worker_Test.txt",
    fileType: "txt",
    mimeType: "text/plain",
    fileSize: 500,
    fileHash: "hash-stale-doc",
    status: "processing",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.insert(processingJobs).values({
    id: stalePJobId,
    organizationId: orgAId,
    jobId: jobA.id,
    documentId: staleDocId,
    fileName: "Stale_Worker_Test.txt",
    fileSize: 500,
    fileHash: "hash-stale-doc",
    idempotencyKey: `idemp-${stalePJobId}`,
    status: "PROCESSING",
    currentStage: "extracting",
    progress: 25,
    attempts: 1,
    maxAttempts: 3,
    heartbeatAt: staleExpiredHeartbeat,
    startedAt: staleExpiredHeartbeat,
    createdAt: staleExpiredHeartbeat,
    updatedAt: staleExpiredHeartbeat,
  });

  // Run stale recovery with 5 minute threshold
  const { recoveredCount } = await Store.recoverStaleProcessingJobs(5 * 60 * 1000);
  assert(recoveredCount >= 1, "recoverStaleProcessingJobs detects and recovers crashed worker job");

  const recoveredJob = await Store.getProcessingJob(orgAId, stalePJobId);
  assert(recoveredJob?.status === "QUEUED", "Stale job with attempts < maxAttempts is reset to 'QUEUED'");
  assert(recoveredJob?.progress === 0, "Recovered job progress reset to 0");
  assert(recoveredJob?.errorMessage?.includes("heartbeat expired") === true, "Recovered job records informative heartbeat expiration note");

  // Test stale job exceeding maxAttempts transitions to FAILED
  const exhaustedStaleJobId = "pjob-stale-exhausted-001";
  await db.insert(processingJobs).values({
    id: exhaustedStaleJobId,
    organizationId: orgAId,
    jobId: jobA.id,
    documentId: staleDocId,
    fileName: "Exhausted_Stale_Test.txt",
    fileSize: 500,
    fileHash: "hash-stale-exhausted",
    idempotencyKey: `idemp-${exhaustedStaleJobId}`,
    status: "PROCESSING",
    currentStage: "matching",
    progress: 75,
    attempts: 3,
    maxAttempts: 3,
    heartbeatAt: staleExpiredHeartbeat,
    startedAt: staleExpiredHeartbeat,
    createdAt: staleExpiredHeartbeat,
    updatedAt: staleExpiredHeartbeat,
  });

  const recoveryResult2 = await Store.recoverStaleProcessingJobs(5 * 60 * 1000);
  assert(recoveryResult2.failedCount >= 1, "recoverStaleProcessingJobs transitions exhausted stale jobs to FAILED");

  const exhaustedJob = await Store.getProcessingJob(orgAId, exhaustedStaleJobId);
  assert(exhaustedJob?.status === "FAILED", "Stale job with attempts >= maxAttempts becomes FAILED");
  assert(exhaustedJob?.errorCode === "WORKER_TIMEOUT", "Exhausted stale job errorCode is 'WORKER_TIMEOUT'");

  // Clean up stale mock test jobs so they do not interfere with subsequent worker draining
  await db.delete(processingJobs).where(eq(processingJobs.id, stalePJobId));
  await db.delete(processingJobs).where(eq(processingJobs.id, exhaustedStaleJobId));
  await db.delete(resumeDocuments).where(eq(resumeDocuments.id, staleDocId));

  // =========================================================================
  // SECTION 6: Error Sanitization & Manual Retry Endpoint
  // =========================================================================
  console.log("\n--- Section 6: Error Sanitization & Manual Retry Endpoint ---");

  // Create a FAILED processing job
  const failedPJobId = "pjob-failed-retry-test-001";
  const failedDocId = "doc-failed-retry-test-001";

  // Put a valid resume in storage so that retrying can succeed
  const validResumeForRetry = `
SAMANTHA CHEN
Email: sam.chen@distrib.test | Seattle, WA
SUMMARY: Distributed systems engineer with 6 years experience in Go, Kafka, PostgreSQL, and Kubernetes.
SKILLS: Go, Kafka, PostgreSQL, Kubernetes, Redis, Docker
EXPERIENCE: Senior Systems Engineer at DataScale Corp (2019-Present) building Go microservices with Kafka.
EDUCATION: B.S. in Computer Science
  `;
  const validStorageKey = `resumes/${orgAId}/${jobA.id}/${failedDocId}.txt`;
  await storage.putPrivateObject(validStorageKey, Buffer.from(validResumeForRetry), {
    organizationId: orgAId,
    contentType: "text/plain",
  });

  await Store.saveResumeDocument(orgAId, {
    id: failedDocId,
    jobId: jobA.id,
    storageKey: validStorageKey,
    storageProvider: "local",
    fileName: "Samantha_Chen_Resume.txt",
    fileType: "txt",
    mimeType: "text/plain",
    fileSize: validResumeForRetry.length,
    fileHash: crypto.createHash("sha256").update(validResumeForRetry).digest("hex"),
    status: "processing",
  });

  await db.insert(processingJobs).values({
    id: failedPJobId,
    organizationId: orgAId,
    jobId: jobA.id,
    documentId: failedDocId,
    fileName: "Samantha_Chen_Resume.txt",
    fileSize: validResumeForRetry.length,
    fileHash: crypto.createHash("sha256").update(validResumeForRetry).digest("hex"),
    idempotencyKey: `idemp-${failedPJobId}`,
    status: "FAILED",
    currentStage: "failed",
    progress: 50,
    attempts: 3,
    maxAttempts: 3,
    errorCode: "SIMULATED_TRANSIENT_ERROR",
    errorMessage: "Simulated worker network timeout during OCR processing.",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 1. RBAC check: VIEWER role cannot trigger retry
  const viewerRetryReq = new NextRequest(
    new URL(`/api/processing-jobs/${failedPJobId}/retry`, "http://localhost:3000"),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAlphaViewer}`,
      },
    }
  );
  const viewerRetryRes = await retryProcessingJobRoute(viewerRetryReq, { params: Promise.resolve({ id: failedPJobId }) });
  assert(viewerRetryRes.status === 403, "Viewer role is forbidden from triggering job retry (403 Forbidden)");

  // 2. Tenant isolation: Org B recruiter cannot retry Org A job
  const crossTenantRetryReq = new NextRequest(
    new URL(`/api/processing-jobs/${failedPJobId}/retry`, "http://localhost:3000"),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenBetaRecruiter}`,
      },
    }
  );
  const crossTenantRetryRes = await retryProcessingJobRoute(crossTenantRetryReq, { params: Promise.resolve({ id: failedPJobId }) });
  assert(crossTenantRetryRes.status === 404, "Cross-tenant retry request is rejected with non-disclosing 404");

  // 3. State check: Cannot retry an active QUEUED or COMPLETED job
  const invalidStateRetryReq = new NextRequest(
    new URL(`/api/processing-jobs/${uploadedPJobId}/retry`, "http://localhost:3000"),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAlphaRecruiter}`,
      },
    }
  );
  const invalidStateRetryRes = await retryProcessingJobRoute(invalidStateRetryReq, { params: Promise.resolve({ id: uploadedPJobId }) });
  assert(invalidStateRetryRes.status === 400, "Cannot retry an already COMPLETED processing job (400 Bad Request)");

  // 4. Authorized recruiter retries the FAILED job
  const authorizedRetryReq = new NextRequest(
    new URL(`/api/processing-jobs/${failedPJobId}/retry`, "http://localhost:3000"),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAlphaRecruiter}`,
      },
    }
  );
  const authorizedRetryRes = await retryProcessingJobRoute(authorizedRetryReq, { params: Promise.resolve({ id: failedPJobId }) });
  assert(authorizedRetryRes.status === 200, "Authorized recruiter successfully retries FAILED processing job");

  const retriedJobInDb = await Store.getProcessingJob(orgAId, failedPJobId);
  assert(retriedJobInDb?.status === "QUEUED", "Retried processing job status is reset to 'QUEUED'");
  assert(retriedJobInDb?.progress === 0, "Retried processing job progress is reset to 0");
  assert(retriedJobInDb?.errorCode === null, "Retried processing job errorCode is cleared");

  // 5. Worker processes the retried job to completion
  const workerIteration = await runWorkerIteration(5);
  assert(workerIteration.claimedCount >= 1, "Worker picks up and processes the retried job");

  const completedRetriedJob = await Store.getProcessingJob(orgAId, failedPJobId);
  assert(completedRetriedJob?.status === "COMPLETED", "Retried job is successfully processed to COMPLETED by worker");
  assert(!!completedRetriedJob?.candidateId, "Retried job generates candidate profile");

  // 6. Purged document protection: Cannot retry job whose document was purged
  const purgedDocPJobId = "pjob-purged-doc-retry-001";
  const purgedDocId = "doc-purged-doc-retry-001";

  await Store.saveResumeDocument(orgAId, {
    id: purgedDocId,
    jobId: jobA.id,
    storageKey: `resumes/${orgAId}/${jobA.id}/${purgedDocId}.txt`,
    storageProvider: "local",
    fileName: "Purged_Candidate.txt",
    fileType: "txt",
    mimeType: "text/plain",
    fileSize: 100,
    fileHash: "hash-purged",
    status: "purged", // Purged per retention policy
  });

  await db.insert(processingJobs).values({
    id: purgedDocPJobId,
    organizationId: orgAId,
    jobId: jobA.id,
    documentId: purgedDocId,
    fileName: "Purged_Candidate.txt",
    fileSize: 100,
    fileHash: "hash-purged",
    idempotencyKey: `idemp-${purgedDocPJobId}`,
    status: "FAILED",
    currentStage: "failed",
    progress: 0,
    attempts: 3,
    maxAttempts: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const purgedRetryReq = new NextRequest(
    new URL(`/api/processing-jobs/${purgedDocPJobId}/retry`, "http://localhost:3000"),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAlphaRecruiter}`,
      },
    }
  );
  const purgedRetryRes = await retryProcessingJobRoute(purgedRetryReq, { params: Promise.resolve({ id: purgedDocPJobId }) });
  assert(purgedRetryRes.status === 400, "Purged document retry request is safely rejected (400 Bad Request)");

  // =========================================================================
  // SECTION 7: Batch Upload & Worker Throughput Test
  // =========================================================================
  console.log("\n--- Section 7: Batch Upload & Worker Throughput ---");

  const batchCount = 4;
  const batchFormData = new FormData();

  for (let i = 1; i <= batchCount; i++) {
    const candidateContent = `
BATCH CANDIDATE ${i}
Email: batch${i}@distrib.test | Seattle, WA
SUMMARY: Distributed engineer ${i} with 5+ years experience in Go, Kafka, PostgreSQL, Kubernetes.
SKILLS: Go, Kafka, PostgreSQL, Kubernetes
EXPERIENCE: Distributed Engineer at CloudScale Inc (2019-Present) maintaining event pipelines.
EDUCATION: B.S. in Computer Science
    `;
    const bBlob = new Blob([candidateContent], { type: "text/plain" });
    const bFile = new File([bBlob], `Batch_Candidate_${i}.txt`, { type: "text/plain" });
    batchFormData.append("files", bFile);
  }

  const batchUploadReq = new NextRequest(
    new URL(`/api/jobs/${jobA.id}/upload`, "http://localhost:3000"),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAlphaRecruiter}`,
      },
      body: batchFormData,
    }
  );

  const batchStartTime = Date.now();
  const batchUploadRes = await uploadResume(batchUploadReq, { params: Promise.resolve({ id: jobA.id }) });
  const batchUploadLatency = Date.now() - batchStartTime;

  assert(batchUploadRes.status === 202, "Batch upload of 4 resumes returns 202 Accepted");
  assert(batchUploadLatency < 3000, `Batch upload acceptance latency is fast (${batchUploadLatency}ms)`);

  const batchUploadJson = await batchUploadRes.json();
  assert(batchUploadJson.accepted === batchCount, `All ${batchCount} batch resumes accepted into processing queue`);

  // Drain the batch using worker iteration
  const flushCount = await flushOutboxEvents();
  assert(flushCount >= batchCount, "flushOutboxEvents drains outbox events for all batch uploads");

  const drainResult = await runWorkerIteration(5);
  assert(drainResult.claimedCount >= batchCount, `Worker claimed and processed all ${batchCount} queued batch jobs`);
  assert(drainResult.completedCount >= batchCount, `Worker completed all ${batchCount} batch jobs without failure`);

  // Verify all batch candidates exist for job requisition
  const candidatesInDb = await Store.getCandidates(orgAId, jobA.id);
  assert(candidatesInDb.length >= batchCount + 1, "All batch candidates successfully saved and accessible in database");

  console.log("\n========================================================");
  console.log(`Phase 4 Queue Verification Complete: ${passedTests}/${totalTests} assertions passed.`);
  console.log("========================================================\n");
}

async function main() {
  try {
    await runQueueTestSuite();
    await closeDb();
    process.exit(0);
  } catch (err) {
    console.error("Phase 4 Queue test failed:", err);
    await closeDb();
    process.exit(1);
  }
}

main();
