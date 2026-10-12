# MatchLens AI — Recruiter Pilot Launch Checklist

**Target Cohort**: 5 Hiring Professionals & Technical Recruiters  
**Auditor**: Senior SRE & Product Validation Lead  
**Document Status**: Pre-Pilot Execution Gate  

Every item in this checklist must be systematically checked before onboarding external participants. Do not initiate live recruiter sessions while any **P0 Blocker** remains open.

---

## Phase A: Code Promotion & Branch Convergence (P0 Blocker)

- [ ] **A.1 Stage & Commit All Working Tree Changes**:
  - Verify modified files: `PROJECT_STATUS.md`, `ROADMAP_GAPS.md`, `lib/db/schema.ts`, `lib/storage/store.ts`, `lib/types.ts`, `lib/observability/pilot-metrics.ts`, `components/PilotFeedbackModal.tsx`, `app/jobs/[id]/evaluation/page.tsx`, etc.
  - Verify untracked files: `drizzle/0004_peaceful_black_tom.sql`, `scripts/test-phase8-validation.ts`, etc.
  - Execute a clean commit on `feature/phase-2-auth-isolation`:
    ```bash
    git add .
    git commit -m "feat(phase-8): implement recruiter validation, telemetry, feedback modal, and evaluation report"
    ```
- [ ] **A.2 Pull Request & CI Verification**:
  - Push branch to remote: `git push origin feature/phase-2-auth-isolation`.
  - Open Pull Request targeting `main`.
  - Verify all 5 GitHub Actions CI workflows pass:
    - `lint-and-typecheck` (0 errors, 0 warnings).
    - `test-matrix` (all 8 test suites green with PostgreSQL 16 service container).
    - `migration-verification` (clean-room migration idempotency).
    - `security-and-audit` (npm audit & secret scan).
    - `production-build` (clean Next.js Turbopack compilation).
- [ ] **A.3 Merge to Main Branch**:
  - Merge PR into `main` using squash or rebase merge.
  - Verify that `main` HEAD contains all migrations through `0004_peaceful_black_tom.sql`.

---

## Phase B: Production Cloud Infrastructure Provisioning (P0 Blocker)

- [ ] **B.1 Managed PostgreSQL Instance**:
  - Provision PostgreSQL 16 database (e.g., Neon Serverless, Supabase, AWS RDS, or Railway).
  - Enable SSL connection mode (`sslmode=require`).
  - Capture connection string `DATABASE_URL`.
- [ ] **B.2 S3-Compatible Object Storage**:
  - Create dedicated private bucket (e.g., Cloudflare R2 `matchlens-resumes-prod` or AWS S3).
  - Configure strict private ACL (no public read).
  - Configure CORS policy permitting authenticated web application domain.
  - Capture credentials: `S3_BUCKET_NAME`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT`.
- [ ] **B.3 Persistent Container Worker Host**:
  - Provision container runtime for background queue worker (e.g., Railway, Render, Fly.io, or AWS ECS).
  - Configure automatic container restart policy (`restart: unless-stopped` or Kubernetes restart policy `Always`).

---

## Phase C: Security & Environment Configuration (P0 Blocker)

- [ ] **C.1 Cryptographic Secret Generation**:
  - Generate production `AUTH_SECRET`:
    ```bash
    openssl rand -base64 32
    ```
  - Generate dedicated `MONITORING_API_KEY`:
    ```bash
    openssl rand -hex 24
    ```
- [ ] **C.2 Environment Variable Injection (Web Service)**:
  - `NODE_ENV=production`
  - `DATABASE_URL=<managed-postgres-url>`
  - `AUTH_SECRET=<32-char-random-secret>`
  - `NEXTAUTH_URL=https://<your-canonical-domain>`
  - `S3_BUCKET_NAME=<bucket-name>`
  - `S3_REGION=<region>`
  - `S3_ACCESS_KEY_ID=<access-key>`
  - `S3_SECRET_ACCESS_KEY=<secret-key>`
  - `S3_ENDPOINT=<endpoint-url>`
  - `RESUME_RETENTION_DAYS=180`
  - `LOG_LEVEL=info`
  - `LOG_FORMAT=json`
  - `MONITORING_API_KEY=<monitoring-key>`
- [ ] **C.3 Environment Variable Injection (Worker Service)**:
  - Inject identical `DATABASE_URL`, `AUTH_SECRET`, and `S3_*` credentials into the worker container environment.
  - Set `WORKER_CONCURRENCY=5`, `WORKER_POLL_INTERVAL_MS=1000`, `WORKER_STALE_TIMEOUT_MS=300000`.

---

## Phase D: Database Schema Migration Execution (P0 Blocker)

- [ ] **D.1 Execute Versioned Migrations**:
  - From CI or authorized admin runner with `DATABASE_URL` configured, run:
    ```bash
    npm run db:migrate
    ```
  - Verify console confirmation:
    - `Applied 0000_...sql`
    - `Applied 0001_daily_scarecrow.sql`
    - `Applied 0002_broad_micromax.sql`
    - `Applied 0003_fresh_morgan_stark.sql`
    - `Applied 0004_peaceful_black_tom.sql`
    - `All migrations completed successfully.`
- [ ] **D.2 Verify Schema Tables & Relational Constraints**:
  - Query database to confirm presence of all 10 core tables:
    - `organizations`, `users`, `jobs`, `candidates`, `analyses`
    - `audit_events`, `resume_documents`, `processing_jobs`, `processing_outbox`, `pilot_feedback`
  - Confirm foreign key cascade constraints are active.

---

## Phase E: Worker Daemon Startup & Health Verification (P0 Blocker)

- [ ] **E.1 Start Worker Daemon**:
  - Launch worker service: `npm run worker`.
  - Observe startup logs:
    ```
    [Worker] MatchLens AI Resume Processing Worker started.
    [Worker] Concurrency: 5, Poll Interval: 1000ms, Stale Timeout: 300000ms.
    ```
- [ ] **E.2 Verify Worker Heartbeat**:
  - Probe `/api/admin/monitoring` with `MONITORING_API_KEY`.
  - Confirm `workerStatus` transitions from `offline` to `healthy` or `idle`.

---

## Phase F: Pre-Flight Synthetic Smoke Test (P0 Blocker)

- [ ] **F.1 Health & Readiness Probes**:
  - `curl -sSf https://<domain>/api/healthz` $\to$ Returns `{"status":"ok"}`.
  - `curl -sSf https://<domain>/api/readyz` $\to$ Returns `{"status":"ready","database":"connected","storage":"connected"}`.
- [ ] **F.2 Automated Ingestion & Queue Test**:
  - Sign in as test recruiter.
  - Create synthetic test requisition (*Senior DevOps Engineer*).
  - Upload synthetic test PDF resume.
  - Verify upload response returns HTTP `202 Accepted` in $<100$ms.
  - Observe UI progress bar transition: `extracting` $\to$ `normalizing` $\to$ `matching` $\to$ `completed` in $<15$s.
- [ ] **F.3 Signed Download & Streaming Test**:
  - Click on uploaded candidate resume link.
  - Verify temporary download link works and headers contain `X-Content-Type-Options: nosniff` and `sandbox` CSP.
- [ ] **F.4 Defensibility Triad & Feedback Test**:
  - Inspect Candidate Score breakdown, Evidence Log, and Inconsistency flags.
  - Submit test feedback via `PilotFeedbackModal`.
  - Verify match score remains invariant (unchanged).
  - Navigate to `/jobs/[id]/evaluation` and verify report renders.
- [ ] **F.5 Cascade Deletion Test**:
  - Delete synthetic candidate. Verify database record, feedback, and S3 file are completely purged.

---

## Phase G: Recruiter Cohort Provisioning & Onboarding

- [ ] **G.1 Participant Agreements**:
  - Ensure all 5 recruiters sign the Pilot Participation & Data Agreement.
  - Confirm agreement that **no unconsented real candidate PII** will be processed without explicit candidate authorization.
- [ ] **G.2 Isolated Tenant Provisioning**:
  - Create 5 separate, isolated organizations:
    1. Org 1: `Pilot - Agency Tech Recruiter`
    2. Org 2: `Pilot - Corporate In-House Talent`
    3. Org 3: `Pilot - Startup Talent Lead`
    4. Org 4: `Pilot - Staffing Specialist`
    5. Org 5: `Pilot - Engineering Hiring Manager`
  - Generate secure initial login credentials for each participant.
- [ ] **G.3 Prepare Standardized Requisition Packets**:
  - Provide a standardized benchmark job description (*Senior Backend Engineer*) to allow cross-participant comparison, while allowing recruiters to bring 1 role of their own choice.
  - Provide a pre-screened synthetic candidate batch (10 resumes) for calibration.

---

## Phase H: Active Pilot Session Execution & Telemetry Monitoring

- [ ] **H.1 Facilitator Readiness**:
  - Facilitator opens [`PILOT_SESSION_SCRIPT.md`](file:///c:/Users/patak/MatchLens-AI/PILOT_SESSION_SCRIPT.md).
  - Confirm timer set for 45 minutes.
- [ ] **H.2 Real-Time Monitoring**:
  - Open `/api/admin/monitoring` dashboard to monitor queue backlog and processing times during upload.
  - Confirm zero uncaught exceptions in cloud logs.
- [ ] **H.3 Document In-Session Observations**:
  - Log any friction points, UI confusion, or ranking disagreements in facilitator notes.

---

## Phase I: Post-Pilot Teardown & Cascade Purge Verification

- [ ] **I.1 Export Job Evaluation Reports**:
  - Download JSON evaluation report from `/api/jobs/[id]/evaluation-report` for each evaluated requisition.
  - Record small-N ranking metrics (Precision@3), disagreement reasons, and time saved.
- [ ] **I.2 Execute Retention / Right-to-be-Forgotten Requests**:
  - If requested by participants, trigger candidate or job deletion.
  - Verify S3 bucket contains zero orphaned files.
- [ ] **I.3 Synthesize Pilot Findings**:
  - Calculate average perceived trust score, usefulness score, and time saved.
  - Apply the Post-Pilot Decision Framework (Green / Yellow / Red).
