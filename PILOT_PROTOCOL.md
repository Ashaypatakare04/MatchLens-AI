# MatchLens AI — Controlled Recruiter Pilot Protocol & Product-Market Validation Plan

## 1. Executive Summary & Objective

This document defines the **Phase 8 Controlled Pilot Protocol** for MatchLens AI. The objective of this pilot is to evaluate whether MatchLens AI improves the real recruiting workflow, produces useful and defensible candidate rankings, saves recruiter time, and earns recruiter trust.

### Guiding Principles & Guardrails
1. **No Premature PMF Claims**: Passing automated test suites and observing positive feedback from five pilot participants does not constitute proof of product-market fit.
2. **Recruiter Agency & Discretion**: MatchLens AI is an assistive decision-support platform. Recruiters retain sole authority over all shortlist and hiring decisions. Blind adherence to AI rankings is strictly discouraged.
3. **Triad Separation of Concerns**: The evaluation workflow rigorously separates **Observed Facts** (verifiable data, latencies), **Automated Predictions** (composite scores, semantic projections), and **Recruiter Judgments** (hiring decisions, qualitative overrides).
4. **Scoring Invariance**: Submitting feedback, notes, or overrides never mutates the underlying deterministic algorithm or historical scores.
5. **Zero PII Exposure**: Telemetry, metrics, and logs never ingest raw resumes, extracted resume text, authentication tokens, or private signed URLs.

---

## 2. Phase 0 — Deployment Readiness Audit Findings

| Component / Subsystem | Intended Behavior | Verified Implementation Status | Deployment Caveat / Limitation |
|---|---|:---:|---|
| **Authentication & Tenant Isolation** | NextAuth v5 session, JWT org claims, RBAC (`ADMIN`, `RECRUITER`, `VIEWER`), non-disclosing 404s on cross-tenant access. | 🟢 Verified (35/35 tests pass) | Ensure `AUTH_SECRET` is set to >= 32 characters in live production container environment. |
| **Private Object Storage** | Dual-mode provider (`lib/storage/object-storage.ts`), AWS S3 / Cloudflare R2 with AES-256-GCM local encrypted fallback. HMAC-SHA256 5-minute signed URLs. | 🟢 Verified (59/59 tests pass) | Production requires `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` configured in secrets manager. |
| **Database Migrations** | Versioned SQL migrations (`drizzle/0000` through `0004`), idempotent migration runner (`lib/db/migrate.ts`), foreign key cascade deletion. | 🟢 Verified (Idempotent runner tested on PostgreSQL) | Clean-room migration verification is enforced in CI. Run `npm run db:migrate` prior to rolling out new versions. |
| **Background Processing Worker** | Decoupled asynchronous worker daemon (`scripts/worker.ts`), transactional outbox pattern, HTTP 202 Accepted upload response (<100ms). | 🟢 Verified (81/81 tests pass) | Worker must run as an independent supervisor process (`docker compose --target worker` or systemd service). |
| **Queue Crash Recovery** | Stale heartbeat timeout (5min), automatic job requeueing (attempts < 3) and failure sanitization (`WORKER_TIMEOUT`). | 🟢 Verified | Documented in `OPERATIONAL_RECOVERY.md`. CLI and Admin API recovery available. |
| **Document Retention & Deletion** | Right-to-delete cascades to private storage objects; expired documents automatically purged by retention runner. | 🟢 Verified | Admin retention runner (`POST /api/admin/retention`) should run on daily cron. |
| **Health & Readiness Probes** | `/api/healthz` (liveness, <50ms) and `/api/readyz` (readiness, bounded DB & S3 checks, zero secrets exposed). | 🟢 Verified | Load balancers must probe `/api/readyz` before routing traffic. |
| **Log Redaction & Sanitization** | Central redaction engine (`lib/logger/redact.ts`) scrubs passwords, JWTs, DB strings, raw resume text, and signed URLs. Newline escaping prevents log forging. | 🟢 Verified | Confirmed zero PII or credentials escape to stdout/stderr. |
| **CI/CD Pipeline** | GitHub Actions (`ci.yml` and `deploy.yml`) runs lint, typecheck, DB service tests, migration clean-room tests, secret scans, and Next.js Turbopack build. | 🟢 Verified | Pull requests to `main` must pass all gates. |

---

## 3. Phase 1 — Five-Recruiter Pilot Protocol

### Participant Cohort Profile
Five hiring professionals across distinct hiring domains:
1. **Participant 1 (Tech Recruiter A)**: Enterprise SaaS hiring (Full-Stack, DevOps, Backend).
2. **Participant 2 (Tech Recruiter B)**: Early-stage startup hiring (Founding Engineers, Generalists).
3. **Participant 3 (Agency Recruiter)**: High-volume technical contracting & specialized sourcing.
4. **Participant 4 (Hiring Manager / Tech Lead)**: Direct engineering leadership evaluating pipeline quality.
5. **Participant 5 (Corporate Talent Acquisition Partner)**: Cross-functional hiring across engineering and product.

### Standardized 9-Task Evaluation Workflow
Each participant conducts the following tasks using an authorized batch of 15–20 candidates for a single live or calibrated job requisition:

```
[1. Requisition Creation] ──> [2. Requirement Calibration] ──> [3. Batch Upload (202 Accepted)]
            │                                                                  │
            ▼                                                                  ▼
[4. Inspect AI Rankings]  ──> [5. Open Grounded Citations]  ──> [6. Identify Missing/Deficits]
            │                                                                  │
            ▼                                                                  ▼
[7. Candidate Comparison] ──> [8. Record Recruiter Decision]──> [9. Submit Structured Feedback]
```

1. **Task 1 — Create a Job Requisition**: Paste or author a job description in `/jobs/new`.
2. **Task 2 — Review & Calibrate Requirements**: Inspect extracted required skills, preferred skills, and experience threshold; adjust scoring weights if necessary.
3. **Task 3 — Upload an Authorized Candidate Batch**: Upload 15–20 resume PDFs in `/jobs/[id]/upload`, verify asynchronous progress bar indicators and queue completion.
4. **Task 4 — Inspect Candidate Rankings**: Review ordered candidate table in `/jobs/[id]/candidates`, noting whether top-ranked profiles match initial intuition.
5. **Task 5 — Open Evidence Supporting a Candidate's Score**: Click "Inspect" to view the 5-level citation matrix, examining whether extracted quotes justify awarded scores.
6. **Task 6 — Identify Missing or Unsupported Qualifications**: Review the "Score Deficit Analysis" to evaluate points lost and verification flags.
7. **Task 7 — Compare Top Candidates**: Select 2–3 candidates and launch the side-by-side tradeoff matrix in `/jobs/[id]/compare`.
8. **Task 8 — Record Recruiter Decision**: Mark candidates as Shortlist, Tech Screen, Hold/Maybe, or Reject with optional screening notes.
9. **Task 9 — Record Structured Feedback**: Click "Pilot Feedback" to rate explanation trust (1–5), perceived utility (1–5), estimated time saved, and record any ranking or evidence disagreements.

---

## 4. Pilot Feedback Questionnaire

Following the completion of the 9 tasks, each participant completes the structured evaluation questionnaire:

### Part A: Usability & Workflow Velocity
1. **Ease of Use**: On a scale of 1 to 5, how intuitive was the requisition-to-shortlist workflow?
2. **Time to Complete**: How many minutes did you spend reviewing this batch compared to your standard screening baseline?
3. **Time Saved**: Did MatchLens AI save you measurable review time? (Estimated minutes saved per batch: `<0`, `0-15`, `15-30`, `30-60`, `60+`).

### Part B: Matching Quality & Ranking Defensibility
4. **Ranking Usefulness**: Did the candidates ranked in the top 3-5 represent viable candidates for an interview screen?
5. **Ranking Disagreements**: Did you observe instances where a highly qualified candidate was ranked too low, or an unqualified candidate was ranked too high? If yes, what caused the discrepancy?
   - *Structured Causes*: Relevant experience overlooked, Transferable skill evaluated incorrectly, Requirement criteria too strict, Unsupported claim in resume, Seniority mismatch, Employment duration calculation error.
6. **Accuracy of Evidence**: Did the extracted quotes and citations accurately reflect the candidate's actual qualifications?
7. **Transferable Skills**: Did the system's recognition of equivalent technologies (e.g. Docker for Kubernetes, GCP for AWS) make sense?
8. **Inconsistency & Verification Flags**: Did the timeline and claim verification warnings feel helpful and objective, or accusatory?

### Part C: Trust & Commercial Viability
9. **Trust in Explanations**: On a scale of 1 to 5, how confident do you feel defending your shortlist to a hiring manager using the evidence pack?
10. **Desired Changes**: What is the single most important feature or workflow change you would require before adopting MatchLens AI daily?
11. **Likelihood of Repeat Use**: On a scale of 0 to 10, how likely are you to use MatchLens AI for your next real requisition?
12. **Pricing Structure & Willingness to Pay**: What commercial model aligns with your organization's recruiting budget?
    - Per-seat monthly SaaS subscription (\$50–\$150/recruiter/mo)
    - Per-job requisition billing (\$20–\$50/job)
    - Pay-per-resume processed (\$0.50–\$2.00/candidate)
    - Enterprise annual license with ATS sync

---

## 5. Phase 2 — Metric Governance Registry

All telemetry is strictly scoped to the authenticated organization and captures zero PII:

| Metric Identifier | Metric Name | Start Event | End Event | Unit | Aggregation Method | Purpose |
|---|---|---|---|---|:---:|---|
| `time_upload_to_completion` | Upload Ingestion Latency | `processing_jobs.created_at` (HTTP 202) | `processing_jobs.completed_at` | Milliseconds | Arithmetic Mean & P95 | Measures background worker pipeline throughput. |
| `processing_failure_rate` | Ingestion Failure Rate | `processing_jobs` enqueue | `processing_jobs.status = 'FAILED'` | Percentage (%) | $\frac{\text{Failed Jobs}}{\text{Total Jobs}} \times 100$ | Detects unhandled PDF parsing crashes or timeouts. |
| `time_to_complete_shortlist` | Time to First Shortlist | Earliest batch processing completion | First candidate marked `shortlisted` | Minutes | Median Duration | Quantifies recruiter workflow acceleration. |
| `candidates_inspected_before_shortlist` | Pre-Shortlist Candidate Inspections | Batch review begins | First shortlist decision recorded | Integer count | Sum & Mean per Job | Evaluates whether top candidates are found immediately without exhaustive manual screening. |
| `evidence_views_and_comparisons` | Defensibility Interactions | Evidence panel or comparison opened | View event logged | Integer count | Sum per Requisition | Measures recruiter engagement with citations and tradeoff analysis. |
| `recruiter_decision_completion` | Decision Completion Rate | Candidates ingested | Explicit non-unreviewed decision recorded | Percentage (%) | $\frac{\text{Reviewed Candidates}}{\text{Total Candidates}} \times 100$ | Tracks recruiter workflow completion across the batch. |
| `ranking_disagreements` | Ranking Disagreement Rate | Candidate ranking displayed | Feedback submitted with category `relevant_ranked_too_low` or `irrelevant_ranked_too_high` | Disagreements count & rate | Frequency count & % of evaluated candidates | Core signal for model calibration and weight misalignment. |
| `user_reported_trust_and_usefulness` | Explanation Trust & Utility | Recruiter inspects match explanation | Likert scale feedback recorded | Score (1.0 to 5.0) | Mean & Histogram | Subjective assessment of explainability and confidence. |
| `repeat_usage_during_pilot` | Multi-Session Engagement | First requisition created | Subsequent active review days / requisitions | Active days / Jobs count | Integer count per Tenant | Measures genuine workflow adoption vs one-time novelty. |

---

## 6. Phase 4 — Recruiter Evaluation Workflow & Disagreement Taxonomy

The evaluation engine aggregates data into three strictly separated categories:

### 1. Observed Facts (Empirical System Observations)
- Document ingestion byte size, format, and parsing confidence.
- Pipeline execution duration from receipt to completion.
- Number of required and preferred skills configured by recruiter.
- Audit event timestamps for decisions and views.

### 2. Automated Predictions (Algorithmic Hypotheses)
- MatchLens composite score (0–100) calculated from deterministic weighted formula.
- AI recommendation category ("Strong Match", "Consider", "Review Required", "Low Alignment").
- Extracted relevant experience years and career continuity gap detection.
- Transferable skill semantic conceptual similarity projections.
- Inconsistency flags and unverified claim notices.

### 3. Recruiter Judgments (Human Hiring Decisions)
- Hiring decision state (`shortlisted`, `maybe`, `rejected`, `needs_verification`).
- Pipeline stage assignments (`screening`, `technical_review`, `interview`, `offer`).
- Structured disagreement category and underlying reasons.
- Perceived trust (1–5) and usefulness (1–5) scores.

### Structured Disagreement Reasons Taxonomy
When recruiters disagree with candidate placement, they record one of the following root causes:
1. `relevant_experience_overlooked`: The candidate had direct domain experience that the extraction algorithm missed or classified under a non-standard title.
2. `transferable_skill_incorrect`: The algorithm awarded partial credit to a technology that does not practically substitute for the required skill.
3. `qualification_misunderstood`: The job requirement was interpreted too strictly (e.g., exact degree required vs equivalent boot camp).
4. `unsupported_candidate_claim`: The candidate listed buzzwords in their resume without supporting project or responsibility context.
5. `seniority_mismatch`: The candidate matches technical keywords but lacks the team leadership, architectural design, or maturity required.
6. `duration_misinterpreted`: Overlapping dates, internships, or part-time work were counted as full-time professional experience.
7. `other`: Unspecified qualitative or contextual hiring discretion.

---

## 7. Phase 6 — Privacy & Participant Safeguards

### Pre-Pilot Checklist
- [x] **Tenant Authorization**: The pilot organization confirms legal basis and authority to process uploaded candidate resumes.
- [x] **Zero Model Training**: Candidate documents and evaluation feedback are strictly processed for scoring and never used to train third-party generative models.
- [x] **De-Identification & Blind Screening**: Anonymized mode is available (`app/jobs/[id]/candidates/page.tsx`) to scrub names, emails, phone numbers, and institution names.
- [x] **Zero PII Telemetry**: Telemetry events never log raw resumes, extracted resume text, authentication tokens, or private signed URLs.
- [x] **Cryptographic Private Storage**: Candidate documents are stored in private object storage (AES-256-GCM encrypted fallback) with 5-minute HMAC-signed URLs.
- [x] **Right to Delete & Retention**: Recruiters can permanently purge candidates and associated storage objects via the UI or API (`DELETE /api/jobs/[id]/candidates/[candidateId]`).
- [x] **Tenant Data Isolation**: Database queries enforce `organization_id NOT NULL` with cascade foreign keys. Cross-tenant access returns non-disclosing 404s.

---

## 8. Post-Pilot Decision Framework

Following the collection of feedback from all five recruiters, findings are prioritized into three actionable tiers:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CRITICAL (P0): Blocks Recruiter Trust & Safety           │
│    - Hallucinated qualifications or fabricated evidence.    │
│    - Candidate ranked in Top 3 with missing required skill. │
│    - Failure rate > 2% or processing latency > 30 seconds.  │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ 2. CALIBRATION (P1): Scoring Formula & Semantic Tuning      │
│    - Transferable skill false positives (e.g. CSS for C++). │
│    - Disagreement rate on Top 5 candidates > 25%.           │
│    - Default scoring weights misaligned with role realities.│
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ 3. ENHANCEMENT (P2): Usability & Feature Ergonomics         │
│    - UI navigation friction or export format refinements.   │
│    - ATS integration requests (Greenhouse, Lever).          │
│    - Bulk decision keyboard shortcuts.                      │
└─────────────────────────────────────────────────────────────┘
```
