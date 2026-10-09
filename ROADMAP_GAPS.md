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

### 2. Multi-Tenant Authentication & Organization Scoping
- **WHY**: There is currently zero authentication or access control in the codebase. Any user with internet access can view, edit, or delete any job requisition, candidate dossier, or audit log.
- **IMPACT**: Absolute blocker for privacy, compliance, and commercial viability.
- **DEPENDENCIES**: Task 1 (PostgreSQL Database Migration).
- **ESTIMATED COMPLEXITY**: High (2–3 days).
- **RELEVANT FILES**:
  - `middleware.ts` (to be created)
  - `lib/auth/` (to be created)
  - `app/api/jobs/route.ts`
  - `app/api/jobs/[id]/candidates/route.ts`
  - `app/api/audit-log/route.ts`
  - `app/settings/page.tsx`

### 3. Row-Level Tenant Isolation on All API Routes
- **WHY**: Even with user login, without strict tenant scoping (`organization_id` foreign keys and database constraints), one company could query or delete candidate data belonging to another company by guessing UUIDs.
- **IMPACT**: High security vulnerability and GDPR/CCPA violation.
- **DEPENDENCIES**: Task 1 (PostgreSQL Migration), Task 2 (Authentication).
- **ESTIMATED COMPLEXITY**: Medium (1–2 days).
- **RELEVANT FILES**:
  - `lib/storage/store.ts`
  - `app/api/jobs/[id]/route.ts`
  - `app/api/jobs/[id]/candidates/[candidateId]/route.ts`
  - `app/api/jobs/[id]/upload/route.ts`

### 4. Production Health Checks & Environment Variable Assertion
- **WHY**: The app silently falls back to local deterministic mode if `GEMINI_API_KEY` is invalid, with no startup validation or health check endpoints for cloud load balancers.
- **IMPACT**: Orchestrators (Kubernetes/ECS) cannot detect failed containers.
- **DEPENDENCIES**: None.
- **ESTIMATED COMPLEXITY**: Low (0.5 day).
- **RELEVANT FILES**:
  - `app/api/healthz/route.ts` (to be created)
  - `lib/config/env.ts` (to be created)
  - `app/api/settings/route.ts`

---

## P1 — Before Private Beta (Required for Pilot Customers)

### 5. Asynchronous Background Worker Queue for Resume Processing
- **WHY**: Currently, when a recruiter uploads resumes, text extraction, parsing, semantic projection, and scoring happen synchronously inside the HTTP handler. Uploading 20+ resumes will cause HTTP 504 gateway timeouts on Vercel or cloud load balancers.
- **IMPACT**: Limits upload batch size to 3–5 resumes; poor user experience during batch screening.
- **DEPENDENCIES**: Redis / SQS infrastructure.
- **ESTIMATED COMPLEXITY**: High (2–3 days).
- **RELEVANT FILES**:
  - `lib/queue/worker.ts` (to be created)
  - `app/api/jobs/[id]/upload/route.ts`
  - `app/jobs/[id]/upload/page.tsx`

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

### 8. Vitest Migration & Automated CI/CD Test Pipeline
- **WHY**: Tests are currently executed via custom standalone `tsx` runner scripts (`scripts/run-edge-cases.ts`, `scripts/run-ai-benchmark.ts`) rather than an industry-standard test framework. There are no code coverage reports or GitHub Actions CI workflows.
- **IMPACT**: Technical debt; prevents automated pull request gating.
- **DEPENDENCIES**: None.
- **ESTIMATED COMPLEXITY**: Medium (1 day).
- **RELEVANT FILES**:
  - `package.json`
  - `vitest.config.ts` (to be created)
  - `.github/workflows/ci.yml` (to be created)
  - `lib/edge-cases.ts`
  - `lib/engine/benchmark-service.ts`

### 9. Application Error Monitoring (Sentry) & Structured Logging (Pino)
- **WHY**: Server errors and unhandled exceptions currently log to stdout without structured alert routing. Production failures will remain invisible to engineering.
- **IMPACT**: High MTTR (Mean Time to Resolution) for beta customer issues.
- **DEPENDENCIES**: Sentry project DSN.
- **ESTIMATED COMPLEXITY**: Low (0.5 day).
- **RELEVANT FILES**:
  - `sentry.client.config.ts` (to be created)
  - `sentry.server.config.ts` (to be created)
  - `next.config.ts`

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

### 13. Recruiter Usability Validation Study (5–10 Hiring Teams)
- **WHY**: The system currently operates entirely on synthetic candidates. Real-world recruiters must evaluate the product with live job requisitions to measure time-to-screen reduction, evidence trustworthiness, and false positive/negative rates.
- **IMPACT**: Validates core product market fit and pricing power.
- **DEPENDENCIES**: Task 1, Task 2, Task 5.
- **ESTIMATED COMPLEXITY**: Medium (1–2 weeks calendar time).
- **RELEVANT FILES**:
  - Recruiter interview notes and benchmark logs (to be added to documentation).

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
