/**
 * MatchLens AI - Phase 3 Private Resume Storage & Retention Test Suite
 * 
 * Verifies:
 * 1. Object Storage Provider initialization & AES-256-GCM encryption at rest.
 * 2. Key generation scoping, tenant validation & path traversal defense.
 * 3. Short-lived signed URL generation, HMAC signature verification, tamper & expiry rejection.
 * 4. Safe streaming download headers (nosniff, CSP sandbox, cache-control).
 * 5. Repository layer resume document persistence & strict tenant isolation.
 * 6. Upload API integration with automatic private storage & resume document linking.
 * 7. Candidate deletion cascading to physical object storage cleanup.
 * 8. Job deletion cascading to physical object storage cleanup.
 * 9. Retention policy engine: automated detection & pruning of expired documents.
 * 10. Admin retention API endpoint role authorization & execution.
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { getDb, closeDb } from "../lib/db";
import { eq } from "drizzle-orm";
import { organizations, users, jobs, candidates, resumeDocuments } from "../lib/db/schema";
import { Store } from "../lib/storage/store";
import { createTestAuthToken } from "../lib/auth/session";
import {
  getObjectStorageService,
  generateResumeStorageKey,
} from "../lib/storage/object-storage";
import {
  computeRetentionExpiresAt,
  executeRetentionPrune,
} from "../lib/storage/retention";
import { DEFAULT_WEIGHTS } from "../lib/extractor/job-extractor";

// Route handlers
import { POST as uploadResume } from "../app/api/jobs/[id]/upload/route";
import { GET as getCandidateDocument } from "../app/api/jobs/[id]/candidates/[candidateId]/document/route";
import { GET as downloadStorageFile } from "../app/api/jobs/storage/download/route";
import { POST as postAdminRetention } from "../app/api/admin/retention/route";

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

async function runStorageTestSuite() {
  console.log("=== MatchLens AI: Phase 3 Private Storage & Privacy Verification ===\n");

  const db = await getDb();

  // Test Tenants & Users
  const orgAId = "org-storage-alpha";
  const orgBId = "org-storage-beta";

  // Clean up any residual data from previous test runs
  await db.delete(resumeDocuments).where(eq(resumeDocuments.organizationId, orgAId));
  await db.delete(resumeDocuments).where(eq(resumeDocuments.organizationId, orgBId));
  await db.delete(candidates).where(eq(candidates.organizationId, orgAId));
  await db.delete(candidates).where(eq(candidates.organizationId, orgBId));
  await db.delete(jobs).where(eq(jobs.organizationId, orgAId));
  await db.delete(jobs).where(eq(jobs.organizationId, orgBId));

  await db
    .insert(organizations)
    .values([
      { id: orgAId, name: "Storage Alpha Corp", slug: "storage-alpha" },
      { id: orgBId, name: "Storage Beta Corp", slug: "storage-beta" },
    ])
    .onConflictDoNothing();

  const userAId = "user-alpha-recruiter";
  const userBId = "user-beta-recruiter";
  const userAdminAId = "user-alpha-admin";
  const userViewerAId = "user-alpha-viewer";

  await db
    .insert(users)
    .values([
      {
        id: userAId,
        organizationId: orgAId,
        email: "recruiter@alpha.com",
        name: "Alpha Recruiter",
        passwordHash: "hash",
        role: "RECRUITER",
      },
      {
        id: userAdminAId,
        organizationId: orgAId,
        email: "admin@alpha.com",
        name: "Alpha Admin",
        passwordHash: "hash",
        role: "ADMIN",
      },
      {
        id: userViewerAId,
        organizationId: orgAId,
        email: "viewer@alpha.com",
        name: "Alpha Viewer",
        passwordHash: "hash",
        role: "VIEWER",
      },
      {
        id: userBId,
        organizationId: orgBId,
        email: "recruiter@beta.com",
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

  // Seed baseline jobs for testing
  const jobA = await Store.createJob(orgAId, {
    id: "job-storage-alpha-001",
    title: "Lead Cloud Architect",
    company: "Storage Alpha Corp",
    location: "Remote",
    workMode: "Remote",
    employmentType: "Full-time",
    rawDescription: "Seeking a lead cloud architect with AWS, Kubernetes, Terraform, and Go experience.",
    requirements: {
      requiredSkills: ["AWS", "Kubernetes", "Terraform", "Go"],
      preferredSkills: ["Docker", "Prometheus"],
      minExperienceYears: 6,
      educationRequirement: "Bachelor's in Computer Science",
      importantKeywords: ["AWS", "Kubernetes", "Terraform", "Go"],
      keyResponsibilities: ["Architect cloud systems", "Lead platform engineering"],
      requirementsList: ["6+ years experience", "Strong Go and Kubernetes"],
    },
    weights: DEFAULT_WEIGHTS,
  });

  const jobB = await Store.createJob(orgBId, {
    id: "job-storage-beta-001",
    title: "Senior Product Designer",
    company: "Storage Beta Corp",
    location: "New York, NY",
    workMode: "Hybrid",
    employmentType: "Full-time",
    rawDescription: "Product designer with Figma and design systems experience.",
    requirements: {
      requiredSkills: ["Figma", "Design Systems"],
      preferredSkills: ["User Testing"],
      minExperienceYears: 4,
      educationRequirement: "Bachelor's Degree",
      importantKeywords: ["Figma", "Design Systems"],
      keyResponsibilities: ["Design UI workflows", "Maintain design system"],
      requirementsList: ["4+ years experience in product design"],
    },
    weights: DEFAULT_WEIGHTS,
  });

  console.log("--- Section 1: Object Storage Abstraction & Encryption at Rest ---");

  const storageService = getObjectStorageService();
  assert(!!storageService, "ObjectStorageService is initialized as a singleton provider");

  const rawResumeContent = "CONFIDENTIAL RESUME - JANE DOE - EXPERT CLOUD ARCHITECT - SSN: 000-11-2222";
  const rawBuffer = Buffer.from(rawResumeContent, "utf-8");
  const testKeyA = generateResumeStorageKey(orgAId, jobA.id, "cand-alpha-001", "pdf");

  assert(
    testKeyA.startsWith(`resumes/${orgAId}/${jobA.id}/cand-alpha-001/`),
    "generateResumeStorageKey correctly scopes key by organizationId, jobId, and candidateId"
  );

  const putMeta = await storageService.putPrivateObject(testKeyA, rawBuffer, {
    organizationId: orgAId,
    contentType: "application/pdf",
  });

  assert(putMeta.key === testKeyA, "putPrivateObject returns metadata with matching storage key");
  assert(putMeta.size === rawBuffer.length, "putPrivateObject reports exact byte size");

  // Verify encryption at rest: examine raw bytes on disk
  const localDiskPath = path.join(process.cwd(), ".data", "storage", testKeyA.replace(/\//g, path.sep));
  assert(fs.existsSync(localDiskPath), "Physical encrypted file exists on disk in private storage path");

  const diskBytes = fs.readFileSync(localDiskPath);
  assert(
    !diskBytes.toString("utf-8").includes("CONFIDENTIAL RESUME"),
    "Stored file is AES-256-GCM encrypted at rest (plaintext string NOT found in raw disk bytes)"
  );

  // Retrieve through authorized provider
  const getResult = await storageService.getPrivateObject(testKeyA, orgAId);
  assert(!!getResult, "getPrivateObject returns decrypted object for authorized organization");
  assert(
    getResult?.data.toString("utf-8") === rawResumeContent,
    "Decrypted object data exactly matches original plaintext buffer"
  );
  assert(getResult?.contentType === "application/pdf", "Decrypted object retains original content type");

  console.log("\n--- Section 2: Storage Multi-Tenant Isolation & Path Traversal Defense ---");

  // Cross-tenant storage read attempt
  let crossOrgReadBlocked = false;
  try {
    await storageService.getPrivateObject(testKeyA, orgBId);
  } catch {
    crossOrgReadBlocked = true;
  }
  assert(
    crossOrgReadBlocked,
    "Storage provider strictly throws error when Organization B attempts to read Organization A's storage key"
  );

  // Path traversal defense
  let pathTraversalBlocked = false;
  try {
    const maliciousKey = `resumes/${orgAId}/../../../etc/passwd`;
    await storageService.putPrivateObject(maliciousKey, Buffer.from("attack"), {
      organizationId: orgAId,
      contentType: "text/plain",
    });
  } catch {
    pathTraversalBlocked = true;
  }
  assert(
    pathTraversalBlocked,
    "Storage provider strictly rejects malicious path traversal key sequence ('..')"
  );

  console.log("\n--- Section 3: Short-Lived Signed Download URLs & HMAC Security ---");

  const signedUrl = await storageService.createShortLivedDownloadUrl(
    testKeyA,
    orgAId,
    300,
    "Jane_Doe_Resume.pdf"
  );

  assert(
    signedUrl.startsWith("/api/jobs/storage/download?token="),
    "createShortLivedDownloadUrl returns download route with token query parameter"
  );

  const token = signedUrl.split("token=")[1];
  assert(!!token && token.includes("."), "Signed download token has [payload].[signature] structure");

  const verified = storageService.verifySignedToken(token);
  assert(!!verified, "verifySignedToken successfully validates legitimate signed token");
  assert(verified?.key === testKeyA, "Signed token payload matches original storage key");
  assert(verified?.organizationId === orgAId, "Signed token payload preserves organizationId");

  // Tampered payload defense
  const [b64Payload, signature] = token.split(".");
  const decodedPayload = JSON.parse(Buffer.from(b64Payload, "base64url").toString("utf-8"));
  decodedPayload.organizationId = orgBId; // Attacker attempts to change organization claim
  const tamperedB64Payload = Buffer.from(JSON.stringify(decodedPayload)).toString("base64url");
  const tamperedToken = `${tamperedB64Payload}.${signature}`;

  const tamperedResult = storageService.verifySignedToken(tamperedToken);
  assert(tamperedResult === null, "verifySignedToken strictly rejects tampered token payload");

  // Tampered signature defense
  const invalidSigToken = `${b64Payload}.invalidsignature12345`;
  assert(
    storageService.verifySignedToken(invalidSigToken) === null,
    "verifySignedToken strictly rejects invalid signature"
  );

  // Expired token defense
  const expiredPayload = {
    key: testKeyA,
    organizationId: orgAId,
    expiresAt: Date.now() - 5000, // 5 seconds in the past
    filename: "expired.pdf",
  };
  const expiredB64 = Buffer.from(JSON.stringify(expiredPayload)).toString("base64url");
  const authSecret = process.env.AUTH_SECRET || "matchlens-dev-secret-key-32-chars-long-minimum-secure";
  const expiredSig = crypto.createHmac("sha256", authSecret).update(expiredB64).digest("base64url");
  const expiredToken = `${expiredB64}.${expiredSig}`;

  assert(
    storageService.verifySignedToken(expiredToken) === null,
    "verifySignedToken strictly rejects expired download tokens"
  );

  console.log("\n--- Section 4: Streaming Download Endpoint Security Headers ---");

  // Valid download request
  const validDownloadReq = new NextRequest(
    new URL(`/api/jobs/storage/download?token=${token}`, "http://localhost:3000")
  );
  const downloadRes = await downloadStorageFile(validDownloadReq);
  assert(downloadRes.status === 200, "Download route returns 200 OK for valid signed token");
  assert(
    downloadRes.headers.get("X-Content-Type-Options") === "nosniff",
    "Download route enforces X-Content-Type-Options: nosniff header"
  );
  assert(
    downloadRes.headers.get("Content-Security-Policy") === "default-src 'none'; sandbox",
    "Download route enforces sandbox Content-Security-Policy header"
  );
  assert(
    downloadRes.headers.get("Cache-Control")?.includes("no-store") === true,
    "Download route enforces private no-store Cache-Control header"
  );
  assert(
    downloadRes.headers.get("Content-Disposition")?.includes("Jane_Doe_Resume.pdf") === true,
    "Download route formats Content-Disposition with sanitized filename"
  );

  // Invalid token download request
  const invalidDownloadReq = new NextRequest(
    new URL(`/api/jobs/storage/download?token=badtoken.badsig`, "http://localhost:3000")
  );
  const invalidRes = await downloadStorageFile(invalidDownloadReq);
  assert(invalidRes.status === 403, "Download route returns 403 Forbidden for bad or invalid token");

  console.log("\n--- Section 5: Resume Document Store Repository Layer ---");

  await db
    .insert(candidates)
    .values({
      id: "cand-alpha-001",
      organizationId: orgAId,
      jobId: jobA.id,
      name: "Jane Doe Test",
      email: "jane.doe@example.com",
      fileHash: "hash-alpha-001",
      fileName: "Jane_Doe_Resume.pdf",
    })
    .onConflictDoNothing();

  const docRecord = await Store.saveResumeDocument(orgAId, {
    id: "doc-test-alpha-001",
    jobId: jobA.id,
    candidateId: "cand-alpha-001",
    storageKey: testKeyA,
    storageProvider: "local",
    fileName: "Jane_Doe_Resume.pdf",
    fileType: "pdf",
    mimeType: "application/pdf",
    fileSize: rawBuffer.length,
    fileHash: crypto.createHash("sha256").update(rawBuffer).digest("hex"),
    status: "active",
    retentionExpiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
  });

  assert(docRecord.id === "doc-test-alpha-001", "saveResumeDocument creates document record");

  const fetchedByOrgA = await Store.getResumeDocument(orgAId, "doc-test-alpha-001");
  assert(!!fetchedByOrgA, "getResumeDocument retrieves document for owner organization");

  const fetchedByOrgB = await Store.getResumeDocument(orgBId, "doc-test-alpha-001");
  assert(fetchedByOrgB === null, "getResumeDocument returns null when queried by non-owner organization");

  const candDoc = await Store.getResumeDocumentByCandidate(orgAId, "cand-alpha-001");
  assert(candDoc?.id === "doc-test-alpha-001", "getResumeDocumentByCandidate retrieves candidate document");

  const jobDocs = await Store.getResumeDocumentsByJob(orgAId, jobA.id);
  assert(jobDocs.length >= 1, "getResumeDocumentsByJob returns documents for target job");

  console.log("\n--- Section 6: Upload Route Integration & Object Storage Persistence ---");

  const resumeText = `
Jane Doe
Email: jane.doe@example.com
Phone: (555) 234-5678
Location: San Francisco, CA

PROFESSIONAL SUMMARY
Senior Cloud Architect with 8 years of production experience designing multi-region AWS architectures, Kubernetes clusters, and Terraform infrastructure.

TECHNICAL SKILLS
AWS, Kubernetes, Terraform, Go, Docker, Linux, CI/CD

EXPERIENCE
Lead Cloud Architect | Global Cloud Systems
2020 - Present
- Architected enterprise multi-cluster Kubernetes platform on AWS EKS serving 10M requests daily.
- Automated 100% of cloud provisioning via Terraform and Go operators.

Senior Systems Engineer | TechNova Solutions
2016 - 2020
- Built highly available microservices infrastructure using Docker and AWS.

EDUCATION
B.S. in Computer Science | UC Berkeley
  `;

  const resumeBlob = new Blob([resumeText], { type: "text/plain" });
  const resumeFile = new File([resumeBlob], "Jane_Doe_Cloud_Resume.txt", { type: "text/plain" });

  const formData = new FormData();
  formData.append("files", resumeFile);

  const uploadReq = new NextRequest(
    new URL(`/api/jobs/${jobA.id}/upload?sync=true`, "http://localhost:3000"),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAlphaRecruiter}`,
      },
      body: formData,
    }
  );

  const uploadRes = await uploadResume(uploadReq, { params: Promise.resolve({ id: jobA.id }) });
  assert(uploadRes.status === 200, "Upload route returns 200 OK for authorized recruiter");

  const uploadData = await uploadRes.json();
  assert(uploadData.processed === 1, "Upload route successfully processes resume");
  const uploadedCandId = uploadData.results[0].candidateId;
  assert(!!uploadedCandId, "Upload returns generated candidateId");

  // Verify resume document record was created in database
  const createdDoc = await Store.getResumeDocumentByCandidate(orgAId, uploadedCandId);
  assert(!!createdDoc, "Upload automatically creates resumeDocuments database record");
  assert(createdDoc?.status === "active", "Created resume document status is 'active'");
  assert(!!createdDoc?.retentionExpiresAt, "Created resume document has retentionExpiresAt set");

  // Verify object was written to private object storage
  const objectExists = await storageService.objectExists(createdDoc!.storageKey, orgAId);
  assert(objectExists, "Uploaded file was persisted into private object storage with server key");

  // Duplicate upload detection: duplicate file within same job should NOT duplicate storage
  const dupFormData = new FormData();
  const dupFile = new File([resumeBlob], "Jane_Doe_Cloud_Resume.txt", { type: "text/plain" });
  dupFormData.append("files", dupFile);

  const dupUploadReq = new NextRequest(
    new URL(`/api/jobs/${jobA.id}/upload?sync=true`, "http://localhost:3000"),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAlphaRecruiter}`,
      },
      body: dupFormData,
    }
  );
  const dupUploadRes = await uploadResume(dupUploadReq, { params: Promise.resolve({ id: jobA.id }) });
  const dupData = await dupUploadRes.json();
  assert(
    dupData.results[0].status === "duplicate",
    "Upload route detects duplicate resume and skips processing"
  );

  console.log("\n--- Section 7: Document Access API & Tenant Isolation ---");

  // Recruiter from Org A requests candidate document
  const getDocReqAlpha = new NextRequest(
    new URL(`/api/jobs/${jobA.id}/candidates/${uploadedCandId}/document`, "http://localhost:3000"),
    {
      headers: { Authorization: `Bearer ${tokenAlphaRecruiter}` },
    }
  );
  const getDocResAlpha = await getCandidateDocument(getDocReqAlpha, {
    params: Promise.resolve({ id: jobA.id, candidateId: uploadedCandId }),
  });
  assert(getDocResAlpha.status === 200, "Recruiter of Org A can access candidate document");
  const docAlphaData = await getDocResAlpha.json();
  assert(!!docAlphaData.downloadUrl, "Candidate document endpoint returns signed download URL");

  // Recruiter from Org B attempts cross-tenant access to Org A's candidate document
  const getDocReqBeta = new NextRequest(
    new URL(`/api/jobs/${jobA.id}/candidates/${uploadedCandId}/document`, "http://localhost:3000"),
    {
      headers: { Authorization: `Bearer ${tokenBetaRecruiter}` },
    }
  );
  const getDocResBeta = await getCandidateDocument(getDocReqBeta, {
    params: Promise.resolve({ id: jobA.id, candidateId: uploadedCandId }),
  });
  assert(
    getDocResBeta.status === 404,
    "Recruiter of Org B receives non-disclosing 404 when attempting to access Org A's candidate document"
  );

  // Unauthenticated request
  const getDocReqAnon = new NextRequest(
    new URL(`/api/jobs/${jobA.id}/candidates/${uploadedCandId}/document`, "http://localhost:3000")
  );
  const getDocResAnon = await getCandidateDocument(getDocReqAnon, {
    params: Promise.resolve({ id: jobA.id, candidateId: uploadedCandId }),
  });
  assert(getDocResAnon.status === 401, "Unauthenticated request to candidate document is rejected with 401");

  console.log("\n--- Section 8: Cascade Deletion & Storage Object Cleanup ---");

  // Delete Candidate: Must delete database record AND purge private object storage
  const candStorageKey = createdDoc!.storageKey;
  const deleteCandSuccess = await Store.deleteCandidate(orgAId, uploadedCandId);
  assert(deleteCandSuccess, "deleteCandidate completes successfully");

  const candInDbAfterDelete = await Store.getCandidate(orgAId, uploadedCandId);
  assert(candInDbAfterDelete === null, "Candidate record is purged from database");

  const storageExistsAfterCandDelete = await storageService.objectExists(candStorageKey, orgAId);
  assert(
    !storageExistsAfterCandDelete,
    "Candidate deletion cascades to private object storage: storage file was purged"
  );

  // Delete Job: Must delete job and purge all associated candidate resumes from storage
  // Create a second candidate for jobB to test job deletion cascade
  await db
    .insert(candidates)
    .values({
      id: "cand-beta-002",
      organizationId: orgBId,
      jobId: jobB.id,
      name: "Bob Designer",
      email: "bob@example.com",
      fileHash: "hash-beta-002",
      fileName: "bob.txt",
    })
    .onConflictDoNothing();

  const candBText = "Candidate Bob - Product Designer - Figma expert";
  const candBBuffer = Buffer.from(candBText, "utf-8");
  const candBKey = generateResumeStorageKey(orgBId, jobB.id, "cand-beta-002", "txt");
  await storageService.putPrivateObject(candBKey, candBBuffer, {
    organizationId: orgBId,
    contentType: "text/plain",
  });
  await Store.saveResumeDocument(orgBId, {
    id: "doc-beta-002",
    jobId: jobB.id,
    candidateId: "cand-beta-002",
    storageKey: candBKey,
    fileName: "bob.txt",
    fileType: "txt",
    fileHash: "hash-beta-002",
  });

  const deleteJobSuccess = await Store.deleteJob(orgBId, jobB.id);
  assert(deleteJobSuccess, "deleteJob completes successfully");

  const storageExistsAfterJobDelete = await storageService.objectExists(candBKey, orgBId);
  assert(
    !storageExistsAfterJobDelete,
    "Job deletion cascades to private object storage: associated resume files purged"
  );

  console.log("\n--- Section 9: Data Retention Policy & Automated Pruning ---");

  const defaultDays = computeRetentionExpiresAt(180);
  assert(
    defaultDays.getTime() > Date.now(),
    "computeRetentionExpiresAt generates a valid future expiration timestamp"
  );

  // Insert mock candidates for retention tests
  await db
    .insert(candidates)
    .values([
      {
        id: "cand-expired-001",
        organizationId: orgAId,
        jobId: jobA.id,
        name: "Expired Candidate",
        email: "expired@example.com",
        fileHash: "hash-expired-001",
        fileName: "expired_candidate.pdf",
      },
      {
        id: "cand-active-001",
        organizationId: orgAId,
        jobId: jobA.id,
        name: "Active Candidate",
        email: "active@example.com",
        fileHash: "hash-active-001",
        fileName: "active_candidate.pdf",
      },
    ])
    .onConflictDoNothing();

  // Create an expired document in Org A
  const expiredKey = generateResumeStorageKey(orgAId, jobA.id, "cand-expired-001", "pdf");
  await storageService.putPrivateObject(expiredKey, Buffer.from("Expired candidate resume"), {
    organizationId: orgAId,
    contentType: "application/pdf",
  });

  await Store.saveResumeDocument(orgAId, {
    id: "doc-expired-001",
    jobId: jobA.id,
    candidateId: "cand-expired-001",
    storageKey: expiredKey,
    fileName: "expired_candidate.pdf",
    fileType: "pdf",
    fileHash: "hash-expired-001",
    status: "active",
    retentionExpiresAt: new Date(Date.now() - 3600000), // Expired 1 hour ago
  });

  // Create an unexpired active document in Org A
  const activeKey = generateResumeStorageKey(orgAId, jobA.id, "cand-active-001", "pdf");
  await storageService.putPrivateObject(activeKey, Buffer.from("Active candidate resume"), {
    organizationId: orgAId,
    contentType: "application/pdf",
  });

  await Store.saveResumeDocument(orgAId, {
    id: "doc-active-001",
    jobId: jobA.id,
    candidateId: "cand-active-001",
    storageKey: activeKey,
    fileName: "active_candidate.pdf",
    fileType: "pdf",
    fileHash: "hash-active-001",
    status: "active",
    retentionExpiresAt: new Date(Date.now() + 86400000), // Expires in 24 hours
  });

  // Run retention prune
  const pruneResult = await executeRetentionPrune(50);
  assert(pruneResult.totalExpired >= 1, "executeRetentionPrune detects expired resume documents");
  assert(pruneResult.successfullyPurged >= 1, "executeRetentionPrune successfully purges expired documents");
  assert(
    pruneResult.purgedDocumentIds.includes("doc-expired-001"),
    "Target expired document was included in purged document IDs"
  );

  // Verify expired file was deleted from storage
  const expiredFileExists = await storageService.objectExists(expiredKey, orgAId);
  assert(!expiredFileExists, "Retention prune permanently purged expired file from object storage");

  // Verify expired document in database is updated to 'purged'
  const purgedDocRecord = await Store.getResumeDocument(orgAId, "doc-expired-001");
  assert(
    purgedDocRecord?.status === "purged",
    "Retention prune updates document database status to 'purged'"
  );

  // Verify active document was NOT pruned
  const activeFileExists = await storageService.objectExists(activeKey, orgAId);
  assert(activeFileExists, "Active non-expired document was preserved in object storage");

  const activeDocRecord = await Store.getResumeDocument(orgAId, "doc-active-001");
  assert(activeDocRecord?.status === "active", "Active document status remains 'active'");

  console.log("\n--- Section 10: Admin Retention API Route Authorization ---");

  // Non-admin (recruiter) attempt
  const adminReqRecruiter = new NextRequest(
    new URL("/api/admin/retention", "http://localhost:3000"),
    {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenAlphaRecruiter}` },
    }
  );
  const adminResRecruiter = await postAdminRetention(adminReqRecruiter);
  assert(
    adminResRecruiter.status === 403,
    "Non-admin role (RECRUITER) is rejected with 403 Forbidden on /api/admin/retention"
  );

  // Viewer attempt
  const adminReqViewer = new NextRequest(
    new URL("/api/admin/retention", "http://localhost:3000"),
    {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenAlphaViewer}` },
    }
  );
  const adminResViewer = await postAdminRetention(adminReqViewer);
  assert(
    adminResViewer.status === 403,
    "Non-admin role (VIEWER) is rejected with 403 Forbidden on /api/admin/retention"
  );

  // Admin attempt
  const adminReqAdmin = new NextRequest(
    new URL("/api/admin/retention", "http://localhost:3000"),
    {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenAlphaAdmin}` },
      body: JSON.stringify({ limit: 10 }),
    }
  );
  const adminResAdmin = await postAdminRetention(adminReqAdmin);
  assert(
    adminResAdmin.status === 200,
    "Authorized ADMIN can execute /api/admin/retention successfully"
  );
  const adminData = await adminResAdmin.json();
  assert(adminData.status === "success", "Admin retention route returns success status");

  // Cleanup active test file
  await storageService.deletePrivateObject(activeKey, orgAId);

  await closeDb();

  console.log(`\n======================================================================`);
  console.log(`Phase 3 Storage & Privacy Suite: All ${passedTests} / ${totalTests} assertions PASSED (100%)`);
  console.log(`======================================================================\n`);
}

runStorageTestSuite().catch((err) => {
  console.error("Test execution failed with unhandled error:", err);
  process.exit(1);
});
