# MatchLens AI — Remaining Roadmap

This document outlines the remaining engineering, security, product, and compliance work required to transition MatchLens AI from its current Product MVP state into a commercial, multi-tenant recruiting SaaS.

---

## P0 — Critical (Immediate Blockers)

### 1. PostgreSQL Database Migration — [COMPLETE]
- **STATUS**: 🟢 **COMPLETE**
- **IMPLEMENTATION SUMMARY**: Successfully migrated primary storage from synchronous local JSON (`.data/db.json` and `.data/audit-log.json`) to PostgreSQL using Drizzle ORM. Created relational tables (`organizations`, `users`, `jobs`, `candidates`, `analyses`, `audit_events`) with foreign keys, indexes, versioned migrations (`drizzle/`), transaction boundaries, optimistic concurrency control, and explicit seeding isolation. All 30 automated tests pass.
- **RELEVANT FILES**:
  - `lib/db/schema.ts`
  - `lib/db/index.ts`
  - `lib/db/migrate.ts`
  - `lib/db/seed.ts`
  - `lib/storage/store.ts`
  - `lib/engine/audit-logger.ts`
  - `scripts/test-database-phase1.ts`
  - `scripts/migrate-from-json.ts`

### 2. Multi-Tenant Authentication & Organization Scoping — [COMPLETE]
- **STATUS**: 🟢 **COMPLETE**
- **IMPLEMENTATION SUMMARY**: Integrated NextAuth v5 (`next-auth@5.0.0-beta.32`) with bcrypt credentials provider, organization-scoped JWT claims, session validation utilities (`requireAuthenticatedUser`, `requireOrganizationMembership`, `requireOrganizationRole`), edge-isolated middleware (`middleware.ts`, `lib/auth/edge.ts`), self-service registration (`/register`, `/api/auth/register`), sign-in UI (`/login`), and role-based permissions (`ADMIN`, `RECRUITER`, `VIEWER`).
- **RELEVANT FILES**:
  - `middleware.ts`
  - `lib/auth/config.ts`
  - `lib/auth/index.ts`
  - `lib/auth/edge.ts`
  - `lib/auth/session.ts`
  - `app/api/auth/[...nextauth]/route.ts`
  - `app/api/auth/register/route.ts`
  - `app/login/page.tsx`
  - `app/register/page.tsx`
  - `components/Navbar.tsx`

### 3. Row-Level Tenant Isolation on All API Routes — [COMPLETE]
- **STATUS**: 🟢 **COMPLETE**
- **IMPLEMENTATION SUMMARY**: Enforced strict `organization_id NOT NULL` constraints with cascade foreign keys in schema (`lib/db/schema.ts`, migration `0001_daily_scarecrow.sql`). Refactored every method in `Store` and `AuditLogger` to require verified `organizationId`. Direct ID access across organizations returns non-disclosing 404s (preventing IDOR/BOLA enumeration). Verified by 32/32 automated test scenarios in `scripts/test-tenant-isolation.ts`.
- **RELEVANT FILES**:
  - `lib/db/schema.ts`
  - `drizzle/0001_daily_scarecrow.sql`
  - `lib/storage/store.ts`
  - `lib/engine/audit-logger.ts`
  - `app/api/jobs/route.ts`
  - `app/api/jobs/[id]/route.ts`
  - `app/api/jobs/[id]/candidates/route.ts`
  - `app/api/jobs/[id]/candidates/[candidateId]/route.ts`
  - `app/api/jobs/[id]/candidates/[candidateId]/export/route.ts`
  - `app/api/jobs/[id]/upload/route.ts`
  - `app/api/jobs/[id]/rescore/route.ts`
  - `app/api/audit-log/route.ts`
  - `scripts/test-tenant-isolation.ts`

### 4. Private Object Storage & Data Retention Engine — [COMPLETE]
- **STATUS**: 🟢 **COMPLETE**
- **IMPLEMENTATION SUMMARY**: Implemented dual-mode private object storage abstraction (`lib/storage/object-storage.ts`) supporting AWS S3 / Cloudflare R2 and local AES-256-GCM encrypted fallback with HMAC-SHA256 signed download tokens. Server-generated storage keys strictly scoped by organization ID with path traversal prevention. Integrated into upload pipeline with 2-phase compensating transaction rollback. Implemented cascade deletion of physical storage objects on candidate/job deletion, safe streaming download endpoint with anti-sniffing and sandbox CSP headers, retention policy engine (`lib/storage/retention.ts`), admin prune API (`/api/admin/retention`), and candidate detail "View Original Resume" UI button. Verified with 59/59 automated tests in `scripts/test-phase3-storage.ts`.
- **RELEVANT FILES**:
  - `lib/storage/object-storage.ts`
  - `lib/storage/retention.ts`
  - `lib/db/schema.ts`
  - `drizzle/0002_broad_micromax.sql`
  - `lib/storage/store.ts`
  - `app/api/jobs/[id]/upload/route.ts`
  - `app/api/jobs/[id]/candidates/[candidateId]/document/route.ts`
  - `app/api/jobs/storage/download/route.ts`
  - `app/api/admin/retention/route.ts`
  - `app/jobs/[id]/candidates/[candidateId]/page.tsx`
  - `scripts/test-phase3-storage.ts`

### 5. Production Health Checks & Environment Variable Assertion — [COMPLETE]
- **STATUS**: 🟢 **COMPLETE**
- **IMPLEMENTATION SUMMARY**: Created ultra-lightweight liveness probe (`GET /api/healthz`), readiness probe (`GET /api/readyz`) with bounded database and object storage timeouts, and real-time monitoring endpoint (`GET /api/admin/monitoring`). Guarantees no credentials or internal IPs leak in probes.
- **RELEVANT FILES**:
  - `app/api/healthz/route.ts`
  - `app/api/readyz/route.ts`
  - `app/api/admin/monitoring/route.ts`
  - `lib/observability/metrics.ts`

---

## P1 — Before Private Beta (Required for Pilot Customers)

### 5. Asynchronous Background Worker Queue for Resume Processing — [COMPLETE]
- **STATUS**: 🟢 **COMPLETE**
- **IMPLEMENTATION SUMMARY**: Decoupled resume parsing, normalization, evidence extraction, and deterministic scoring from the Next.js HTTP request cycle. Implemented a robust PostgreSQL transactional outbox pattern with schema tables `processing_jobs` and `processing_outbox` (migration `0003_fresh_morgan_stark.sql`). The upload endpoint (`POST /api/jobs/[id]/upload`) returns HTTP `202 Accepted` in $<100$ms with assigned job IDs. A standalone background worker daemon (`scripts/worker.ts`, `lib/queue/worker.ts`, callable via `npm run worker`) claims jobs with optimistic concurrency locking, executes runtime-agnostic evaluation (`lib/queue/processor.ts`), tracks stages (`extracting` $\to$ `normalizing` $\to$ `matching`), records heartbeats, automatically recovers stale jobs from crashed workers, and supports recruiter manual retry (`POST /api/processing-jobs/[id]/retry`). The recruiter UI (`app/jobs/[id]/upload/page.tsx`) features live background queue monitoring, stage indicators, animated progress bars, and retry controls. Fully verified by 79/79 automated tests in `scripts/test-phase4-queue.ts`.
- **RELEVANT FILES**:
  - `lib/queue/types.ts`
  - `lib/queue/processor.ts`
  - `lib/queue/worker.ts`
  - `scripts/worker.ts`
  - `drizzle/0003_fresh_morgan_stark.sql`
  - `app/api/jobs/[id]/upload/route.ts`
  - `app/api/jobs/[id]/processing-jobs/route.ts`
  - `app/api/processing-jobs/[id]/route.ts`
  - `app/api/processing-jobs/[id]/retry/route.ts`
  - `app/jobs/[id]/upload/page.tsx`
  - `scripts/test-phase4-queue.ts`

### 6. Side-by-Side Original PDF Document Previewer
- **WHY**: Recruiters need to visually inspect the original styled PDF resume alongside MatchLens evidence citations to verify formatting, layout, and visual presentation.
- **IMPACT**: Significantly increases recruiter trust in extracted evidence snippets.
- **DEPENDENCIES**: Object storage for original resumes (S3 / Cloudflare R2).
- **ESTIMATED COMPLEXITY**: Medium (1–2 days).
- **RELEVANT FILES**:
  - `app/jobs/[id]/candidates/[candidateId]/page.tsx`
  - `components/DocumentViewerModal.tsx` (to be created)
  - `app/api/jobs/[id]/candidates/[candidateId]/document/route.ts` (to be created)

### 7. Bulk Candidate Pipeline Actions
- **WHY**: Recruiters currently have to inspect and update candidate decisions one-by-one. In a real hiring workflow, recruiters need to select 10 candidates from the leaderboard and perform batch actions.
- **IMPACT**: Core usability bottleneck for recruiters managing high-volume requisitions.
- **DEPENDENCIES**: None.
- **ESTIMATED COMPLEXITY**: Medium (1 day).
- **RELEVANT FILES**:
  - `app/jobs/[id]/candidates/page.tsx`
  - `app/api/jobs/[id]/candidates/route.ts`

### 8. Automated CI/CD Pipeline & Migration Verification — [COMPLETE]
- **STATUS**: 🟢 **COMPLETE**
- **IMPLEMENTATION SUMMARY**: Established a production-grade GitHub Actions CI/CD pipeline (`.github/workflows/ci.yml`, `.github/workflows/deploy.yml`) automating strict dependency installation (`npm ci`), ESLint, TypeScript typecheck (`tsc --noEmit`), automated test suites across 7 matrices (263/263 passing), clean-room PostgreSQL migration verification, supply chain security audit, and Turbopack production compilation. Created multi-stage Dockerfile and docker-compose configurations.
- **RELEVANT FILES**:
  - `.github/workflows/ci.yml`
  - `.github/workflows/deploy.yml`
  - `CI_CD.md`
  - `Dockerfile`
  - `docker-compose.yml`
  - `package.json`

### 9. Application Error Monitoring & Structured JSON Logging — [COMPLETE]
- **STATUS**: 🟢 **COMPLETE**
- **IMPLEMENTATION SUMMARY**: Implemented production structured JSON logger (`lib/logger/index.ts`) with central recursive redaction (`lib/logger/redact.ts`) guaranteeing passwords, JWTs, Bearer tokens, DB credentials, S3 secrets, HMAC URLs, candidate PII, and raw resumes are never logged. Added request correlation validation (`extractOrGenerateRequestId`), child loggers, Sentry telemetry adapter (`lib/observability/error-tracker.ts`), alert definitions (`lib/observability/alerts.ts`), and admin operational recovery API & CLI (`app/api/admin/recovery/route.ts`, `scripts/recovery.ts`, `OPERATIONAL_RECOVERY.md`).
- **RELEVANT FILES**:
  - `lib/logger/index.ts`
  - `lib/logger/redact.ts`
  - `lib/observability/metrics.ts`
  - `lib/observability/alerts.ts`
  - `lib/observability/error-tracker.ts`
  - `app/api/admin/recovery/route.ts`
  - `scripts/recovery.ts`
  - `scripts/test-phase6-observability.ts`
  - `OPERATIONAL_RECOVERY.md`

---

## P2 — Before Public Launch (Commercial SaaS Foundation)

### 10. Self-Serve Stripe Subscription & Usage Billing
- **WHY**: Monitization and automated customer onboarding require subscription management, tier enforcement (e.g. Starter: 3 active jobs, Pro: 15 active jobs, Enterprise: unlimited), and resume upload metering.
- **IMPACT**: Necessary for commercial revenue generation.
- **DEPENDENCIES**: Task 1 (Database), Task 2 (Auth).
- **ESTIMATED COMPLEXITY**: High (3 days).
- **RELEVANT FILES**:
  - `lib/billing/stripe.ts` (to be created)
  - `app/api/billing/webhook/route.ts` (to be created)
  - `app/pricing/page.tsx` (to be created)

### 11. ATS Webhook & Two-Way Sync (Greenhouse & Lever)
- **WHY**: Enterprise recruiters will not manually export resumes from Greenhouse and re-upload them to MatchLens. Candidate applications must flow directly into MatchLens via webhooks, and scores must sync back to the ATS candidate profile.
- **IMPACT**: Unlocks adoption by mid-market and enterprise talent acquisition teams.
- **DEPENDENCIES**: Task 1 (Database), Task 2 (Auth).
- **ESTIMATED COMPLEXITY**: High (3–4 days).
- **RELEVANT FILES**:
  - `app/api/integrations/greenhouse/route.ts` (to be created)
  - `app/api/integrations/lever/route.ts` (to be created)
  - `lib/integrations/ats-client.ts` (to be created)

### 12. Legal, Terms of Service & Privacy Policy Framework
- **WHY**: Processing candidate resumes (containing phone numbers, home addresses, work history, and demographic indicators) without published Terms of Service, Privacy Policies, and Data Processing Agreements (DPA) violates GDPR, CCPA, and standard enterprise vendor compliance.
- **IMPACT**: Legal liability and enterprise procurement rejection.
- **DEPENDENCIES**: Legal counsel review.
- **ESTIMATED COMPLEXITY**: Medium (1–2 days).
- **RELEVANT FILES**:
  - `app/terms/page.tsx` (to be created)
  - `app/privacy/page.tsx` (to be created)
  - `components/Footer.tsx` (to be created)

### 13. Recruiter Usability Validation Study (5-Recruiter Pilot Framework) — [COMPLETE / PILOT-READY]
- **STATUS**: 🟢 **FRAMEWORK COMPLETE & INSTRUMENTED**
- **IMPLEMENTATION SUMMARY**: Established the 5-recruiter pilot protocol ([`PILOT_PROTOCOL.md`](file:///c:/Users/patak/MatchLens-AI/PILOT_PROTOCOL.md)), standardized 9-task evaluation workflow, 12-question feedback questionnaire, schema table `pilot_feedback` (migration `0004_peaceful_black_tom.sql`), PII-scrubbed telemetry registry (`lib/observability/pilot-metrics.ts`), in-app feedback modal (`components/PilotFeedbackModal.tsx`), job evaluation report (`/api/jobs/[id]/evaluation-report`), pilot evaluation dashboard (`/jobs/[id]/evaluation`), and 53 automated validation assertions (`scripts/test-phase8-validation.ts`).
- **IMPACT**: Enables defensible, tenant-isolated measurement of recruiter time saved, trust scores, ranking disagreements, and willingness-to-pay without altering deterministic candidate scores or risking PII leakage.
- **DEPENDENCIES**: Phase 1–6 complete.
- **ESTIMATED COMPLEXITY**: Complete; awaiting calendar execution with 5 external recruiting professionals.
- **RELEVANT FILES**:
  - `PILOT_PROTOCOL.md`
  - `lib/db/schema.ts` (`pilotFeedback`)
  - `drizzle/0004_peaceful_black_tom.sql`
  - `lib/observability/pilot-metrics.ts`
  - `lib/storage/store.ts` (`createPilotFeedback`, `getJobEvaluationReport`)
  - `app/api/jobs/[id]/feedback/route.ts`
  - `app/api/jobs/[id]/evaluation-report/route.ts`
  - `app/api/jobs/[id]/telemetry/route.ts`
  - `components/PilotFeedbackModal.tsx`
  - `app/jobs/[id]/evaluation/page.tsx`
  - `scripts/test-phase8-validation.ts`

### 14. Custom Transferable Skill Taxonomy Configuration
- **WHY**: Different engineering organizations have distinct hiring philosophies (e.g., Company A accepts Kotlin as 90% equivalent to Java; Company B demands direct Java only). Currently, transferable rules are hardcoded in `lib/normalization/transferable-engine.ts`.
- **IMPACT**: Enables recruiters to tailor matching rules to their specific technical stack.
- **DEPENDENCIES**: Task 1 (Database).
- **ESTIMATED COMPLEXITY**: Medium (2 days).
- **RELEVANT FILES**:
  - `lib/normalization/transferable-engine.ts`
  - `app/jobs/[id]/page.tsx`
  - `components/TransferableRulesModal.tsx` (to be created)

---

## P3 — Future Enterprise Capabilities

### 15. Optical Character Recognition (OCR) Engine Fallback
- **WHY**: `unpdf` fails on scanned, photocopied, or image-only PDF resumes, resulting in 0 extracted text.
- **IMPACT**: Prevents false negatives on international and non-digital resume submissions.
- **DEPENDENCIES**: AWS Textract or Tesseract.js worker integration.
- **ESTIMATED COMPLEXITY**: Medium (2 days).
- **RELEVANT FILES**:
  - `lib/parsers/pdf-parser.ts`
  - `lib/parsers/ocr-extractor.ts` (to be created)

### 16. Multi-Column Layout Spatial PDF De-tangling
- **WHY**: Pure text extraction from two-column PDF resumes can interleave left-column skills with right-column experience text.
- **IMPACT**: Improves chronological timeline accuracy for modern designer resumes.
- **DEPENDENCIES**: Spatial PDF coordinate parsing engine.
- **ESTIMATED COMPLEXITY**: High (3–4 days).
- **RELEVANT FILES**:
  - `lib/parsers/pdf-parser.ts`
  - `lib/parsers/document-extractor.ts`

### 17. Enterprise SAML 2.0 / Okta SSO Integration
- **WHY**: Enterprise security teams require Single Sign-On (SSO) and SCIM user provisioning for company-wide software deployments.
- **IMPACT**: Required for enterprise contracts ($20k+ ACV).
- **DEPENDENCIES**: Task 2 (Authentication).
- **ESTIMATED COMPLEXITY**: High (3 days).
- **RELEVANT FILES**:
  - `lib/auth/sso.ts` (to be created)

### 18. NYC Local Law 144 & EU AI Act Algorithmic Bias Audit
- **WHY**: Automated employment decision tools (AEDTs) used in hiring must undergo annual independent bias audits and publish impact ratios to legally operate in New York City and the European Union.
- **IMPACT**: Regulatory compliance for enterprise US and EU customers.
- **DEPENDENCIES**: External auditing firm engagement.
- **ESTIMATED COMPLEXITY**: High (External coordination).
- **RELEVANT FILES**:
  - `lib/engine/bias-metrics.ts` (to be created)
  - `public/compliance/bias-audit-report.pdf` (to be created)
