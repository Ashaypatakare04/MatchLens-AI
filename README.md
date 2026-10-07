# MatchLens AI — Evidence-Backed Semantic Candidate Matching System
**ALGOTHON’26 — Track ALG-AI-01: AI Resume & Job Matching System**

> **MatchLens AI — Evidence-backed candidate matching for faster, more trustworthy hiring.**  
> *MatchLens doesn't just rank candidates. It explains the exact contextual evidence behind every requirement, credits substantiated transferable skills, discounts unsubstantiated buzzword lists, and flags claims requiring human recruiter verification.*

[![Test Suite](https://img.shields.io/badge/Edge%20Cases-12%2F12%20PASS-brightgreen)](#11-automated-edge-cases--reliability-suite-12-tests)
[![AI Benchmark](https://img.shields.io/badge/AI%20Benchmark-8%2F8%20PASS%20(100%25%20Win%20Rate)-blue)](#9-ai-evaluation--benchmark-suite-proving-semantic-beats-keywords)
[![Build](https://img.shields.io/badge/Next.js%2016-Build%20Passing-success)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%20Strict-blue)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-gray)](LICENSE)

---

### 📑 Independent Audit & QA Reports
- 📄 **[FINAL_QA_REPORT.md](FINAL_QA_REPORT.md)** — *Comprehensive Pre-Fix Codebase Audit, 8-Failure Test Matrix, and Remediation Blueprint.*
- 📄 **[POST_FIX_QA_REPORT.md](POST_FIX_QA_REPORT.md)** — *Post-Fix Regression Report, 13/13 Failures Resolved, Test & Build Verification Outputs.*

---

## 1. Problem & Core Weaknesses in Legacy ATS

Traditional Applicant Tracking Systems (ATS) and naive "AI matchers" suffer from fatal structural flaws:
1. **Shallow Keyword Overlap**: Rank candidates strictly by keyword frequency. A candidate repeating `"React"` 20 times in a skills list outranks an engineer who built high-throughput systems in Angular and Vue.
2. **False Negatives on Transferable Skills**: A candidate with 5 years of enterprise Azure cloud infrastructure or PostgreSQL/MySQL relational modeling is marked as `0% Missing` for an AWS or database requirement.
3. **No Evidence Contextuality**: A buzzword listed once in a skills summary receives the exact same score as a skill proven across 4 years of production responsibilities with quantified latency or revenue metrics.
4. **Opaque Black-Box Hallucinations**: Systems delegate scoring to LLMs that return arbitrary numbers (e.g., "87%") with no mathematical transparency or recruiter adjustability.
5. **Total vs Relevant Experience Blindness**: 10 years of retail or clerical management is treated as identical to 10 years of software engineering.

---

## 2. The MatchLens AI Solution

MatchLens AI transforms candidate matching from shallow keyword filtering into an **evidence-grounded semantic decision-support system**:

- **Hybrid Semantic Architecture**: Real contextual similarity layer supporting Google Gemini `text-embedding-004` alongside a 100% offline, deterministic semantic projection engine (12 domain clusters, subword n-gram Jaccard, TF-IDF lexical, cosine similarity, asymmetric fuzzy containment).
- **Requirement-Level Matching (Categories A–E)**: Every job requirement is evaluated independently into:
  - `A. DIRECT MATCH`
  - `B. TRANSFERABLE / PARTIAL MATCH`
  - `C. WEAK / RELATED EVIDENCE`
  - `D. MISSING`
  - `E. CONFLICTING / UNCERTAIN`
- **5-Level Contextual Evidence Quality**:
  - `Level 0`: No evidence ($0.0\times$)
  - `Level 1`: Skills list only ($0.35\times$)
  - `Level 2`: Technical project description ($0.65\times$)
  - `Level 3`: Work responsibility in employment history ($0.85\times$)
  - `Level 4`: Measurable production achievement ($0.95\times$)
  - `Level 5`: Cross-substantiated across multiple independent sections ($1.0\times$)
- **Contextual Transferable Skills Engine**: Grants capped, justified credit ($0.65 - 0.80$ max) only when substantiated by architectural engineering context (Angular/Vue $\to$ React; Azure $\to$ AWS; MySQL $\to$ PostgreSQL; HTTP APIs $\to$ REST APIs; Automated Pipelines $\to$ CI/CD). Transferable credit **never** equals direct credit.
- **Relevant vs Total Experience**: Distinguishes cumulative calendar tenure from verified, domain-aligned engineering tenure.
- **Deterministic Transparent Scoring**: Recruiters configure custom weights (Skills, Experience, Responsibilities, Projects, Education) and receive an auditable, reproducible breakdown.
- **Interactive AI Evaluation Dashboard (`/evaluation`)**: Live executable benchmarks (Tests 1–8), 6 judge demonstration cases (Cases A–F), and an interactive sandbox proving semantic matching decisively outperforms keyword baselines.

---

## 3. End-to-End System Architecture

```
JOB DESCRIPTION                           CANDIDATE RESUME
      │                                          │
      ▼                                          ▼
Requirement Extraction (Job Extractor)    Multi-Format Document Parsing (unpdf / mammoth)
      │                                          │
      ▼                                          ▼
Requirement Classification                Profile Normalization & Timeline Resolver
(Required / Preferred / Experience)              │
      │                                          ▼
      ├───────────────────┬──────────────────────┘
                          │
                          ▼
            Contextual Evidence Classifier (Levels 0 – 5)
                          │
                          ▼
            Contextual Transferable Engine (Taxonomy + Context Terms)
                          │
                          ▼
            Semantic Similarity Layer
            (Gemini Embeddings OR Deterministic Multi-Domain Vector Projection)
                          │
                          ▼
            Requirement-Level Evaluator (Categories A – E)
            - Semantic Score, Evidence Score, Experience Score, Confidence
                          │
                          ▼
            Profile Consistency Checker (ALG-AI-01 Bonus)
            - Unsupported skill claims
            - Overlapping employment dates
            - Tenure discrepancy checks
                          │
                          ▼
            Deterministic Weighted Scorer (Recruiter Configurable Weights)
                          │
                          ▼
            Evidence Citations & Explainable Summary
                          │
                          ▼
            Recruiter Decision Support (Shortlist / Maybe / Reject + Notes)
```

---

## 4. Reusable Semantic Similarity & Embedding Fallback

The semantic similarity engine is located at `lib/engine/semantic-similarity.ts`.

### Cloud vs Local Offline Fallback
- **Cloud Mode**: When `GEMINI_API_KEY` is present, uses Google Gemini `text-embedding-004` (768 dimensions) to compute cosine similarities.
- **Local Fallback Mode**: When running offline or without an API key, the system automatically falls back to MatchLens's **Deterministic Multi-Domain Semantic Projection Engine**:
  - 12 orthogonal domain clusters (Frontend SPA, Backend Runtime, Relational DB, NoSQL, Cloud Primitives, Container Orchestration, CI/CD, API Architecture, Data Engineering, Testing, Systems Programming, Architecture & Design).
  - Subword 3-gram & 4-gram Jaccard similarity for morphological and spelling variations.
  - TF-IDF style rare-token boost.
  - Asymmetric domain containment (`computeDomainContainment`) to evaluate single-domain requirements against comprehensive multi-domain resumes without vector dilution.
  - **Zero random numbers, zero fabricated vectors.**
- **UI Transparency**: The system explicitly displays status badges in the top navigation and candidate cards:
  - *“Semantic analysis enabled”* (Gemini configured)
  - *“Semantic API unavailable — using local matching fallback”* (Offline mode)

---

## 5. Contextual Evidence Hierarchy (Levels 0 – 5)

Every extracted skill or requirement is classified by its depth of evidence in `lib/engine/evidence-classifier.ts`:

$$\text{Contextual Score} = \text{Skill Relevance} \times \text{Evidence Multiplier} \times \text{Recency Multiplier} \times \text{Duration Factor}$$

| Level | Classification | Multiplier | Description & Grounding |
|---|---|:---:|---|
| **Level 0** | No Evidence | $0.00$ | Absent from entire resume document. |
| **Level 1** | Skills List Only | $0.35$ | Listed in skills summary without work duties or projects. |
| **Level 2** | Project Description | $0.65$ | Implemented within a personal or academic project. |
| **Level 3** | Work Responsibility | $0.85$ | Documented within employment responsibilities. |
| **Level 4** | Measurable Achievement | $0.95$ | Supported by quantified production impact (%, QPS, users, latency). |
| **Level 5** | Multiple Independent Sections | $1.00$ | Cross-validated across $\ge 2$ independent sections (e.g. Skills + Work + Projects). |

---

## 6. Contextual Transferable Skills Engine

Located at `lib/normalization/transferable-engine.ts`. Evaluates architectural counterparts while enforcing two strict rules:
1. **Transfer credit never equals direct credit** (capped between $0.65$ and $0.80$).
2. **Context verification required**: The candidate must exhibit foundational engineering terms in work history (e.g., Angular $\to$ React requires *components, state management, SPA*; Azure $\to$ AWS requires *IAM, virtual networks, compute, storage*).

### Supported Transferable Counterparts

| Target Requirement | Transferable Sources | Base Ratio | Required Contextual Terms |
|---|---|:---:|---|
| **React** | Angular, Vue.js, Svelte, SolidJS | $0.70$ | components, state, spa, virtual dom, props, reactive |
| **AWS** | Azure, Google Cloud (GCP) | $0.75$ | cloud, iam, compute, vpc, s3, storage, lambda, serverless |
| **PostgreSQL** | MySQL, MariaDB, Oracle SQL | $0.75$ | sql, relational, queries, schema, acid, indexes, joins |
| **Node.js** | Go, Python (FastAPI/Django), Java Spring | $0.65$ | backend, server, asynchronous, services, microservices |
| **REST APIs** | HTTP APIs, GraphQL, gRPC | $0.75$ | api, endpoints, service, schema, http, requests |
| **CI/CD** | Automated Pipelines, GitHub Actions, GitLab CI, Jenkins | $0.80$ | pipeline, build, deploy, test, stage, automation, release |

---

## 7. Relevant vs Total Experience Calculation

Calculates cumulative calendar tenure alongside domain-relevant software tenure:
- **Total Experience**: Cumulative months across all extracted employment entries, deducting verified overlapping dates.
- **Relevant Experience**: Filtered specifically by technical engineering titles, software domain keywords, and utilization of required/preferred technologies. Unrelated careers (e.g., retail store manager, restaurant server) receive $0.05$ relevance weight.

---

## 8. Deterministic Scoring Formula & Recruiter Weights

The final overall score is calculated as a transparent weighted sum of 5 components:

$$\text{Overall Score} = \sum_{c \in C} \left( \text{Score}_c \times \frac{\text{Weight}_c}{100} \right)$$

Where $C = \{\text{Skills}, \text{Experience}, \text{Responsibilities}, \text{Projects}, \text{Education}\}$.

- **Default Weights**: Skills: 30%, Experience: 25%, Responsibilities: 20%, Projects: 15%, Education: 10%.
- **Recruiter Configurable**: Recruiters can adjust weights via an interactive modal (`Adjust Weights`).
- **Transparency Notice**: *“This is a configurable matching score, not a probability of hiring success.”*

---

## 9. AI Evaluation & Benchmark Suite (Proving Semantic Beats Keywords)

Access the live dashboard at **`/evaluation`** or run via CLI:
```bash
npm run test:benchmark
```

The benchmark suite (`lib/engine/benchmark-service.ts`) executes **8 adversarial test scenarios** specifically designed to expose keyword matching flaws:

| Test # | Requirement | Resume Context | Keyword Score | MatchLens Score | Verdict & Outcome |
|:---:|---|---|:---:|:---:|---|
| **1** | React development | 5 yrs Angular & Vue component systems | $0 / 100$ (Missing) | **$73 / 100$ (Transferable)** | **PASS**: Catches keyword false negative. |
| **2** | AWS | Enterprise Azure cloud engineer | $0 / 100$ (Missing) | **$79 / 100$ (Transferable)** | **PASS**: Recognizes cloud infrastructure counterpart. |
| **3** | PostgreSQL | MySQL database indexing & ACID engineer | $0 / 100$ (Missing) | **$79 / 100$ (Transferable)** | **PASS**: Credits relational database equivalence. |
| **4** | REST API development | Designed high-throughput HTTP APIs | $0 / 100$ (Missing) | **$79 / 100$ (Transferable)** | **PASS**: Understands semantic synonymy. |
| **5** | Kubernetes | Mentioned only once in skills list | $100 / 100$ (Exact) | **$35 / 100$ (Level 1 Penalty)** | **PASS**: Catches keyword false positive on buzzword. |
| **6** | Kubernetes | Operated AWS EKS clusters serving 15M QPS | $100 / 100$ (Exact) | **$100 / 100$ (Level 5 Grounded)** | **PASS**: Rewards cross-substantiated production proof. |
| **7** | Machine Learning | Supervised learning & predictive classifiers | $50 / 100$ (Partial) | **$62 / 100$ (Semantic Concept)** | **PASS**: Matches ML subdiscipline to parent domain. |
| **8** | CI/CD | Automated build, test & deployment pipelines | $0 / 100$ (Missing) | **$80 / 100$ (Transferable)** | **PASS**: Recognizes DevOps pipeline equivalence. |

**Benchmark Results Summary**:
- **Total Scenarios**: 8
- **MatchLens Win Rate**: 8 / 8 (100%)
- **Keyword Fatal Flaws Caught**: 6 false negatives, 1 false positive
- **Average Semantic Similarity**: 63.8%
- **Execution Time**: ~65ms

---

## 10. Judge Demonstration Cases (Cases A–F)

Accessible under the **“Judge Demo Cases”** tab in `/evaluation` and directly runnable via API `/api/judge-demo`:
- **Case A**: Transferable Frontend Engineer (Angular/Vue credited toward React; partial credit with architecture reasoning).
- **Case B**: Cloud Primitives Equivalence (Azure cloud engineer credited toward AWS with IAM/VPC citations).
- **Case C**: Buzzword-Stuffed Junior (Kubernetes listed in skills summary, penalized down to Level 1: 35%).
- **Case D**: Senior Production Operator (Kubernetes with production scale & metrics, rewarded with Level 5: 100%).
- **Case E**: Relational Database Translatability (MySQL engineer credited toward PostgreSQL).
- **Case F**: High Total Tenure in Unrelated Field (10 years retail management yields 10.0 total yrs vs 0.0 relevant software yrs).

---

## 11. Automated Edge Cases & Reliability Suite (12 Tests)

Run via UI (`/test-suite`) or CLI:
```bash
npm run test:edge-cases
```

All 12 edge cases execute and pass cleanly:
1. **Perfect Candidate**: All 5 required skills, CS degree, 6+ yrs tenure $\to$ Score $\ge 85$, 0 missing.
2. **Poor Candidate**: Unrelated retail background $\to$ Score $18/100$, Low Alignment recommendation.
3. **Missing Required Skill**: Strong UI dev lacking Node.js & PostgreSQL $\to$ Score capped at $20/100$, flags missing.
4. **Strong Transferable Skills**: Angular/Vue & MySQL $\to$ Recognizes transferable skills, awards grounded credit.
5. **Messy Resume**: ASCII borders and unconventional delimiters $\to$ Parses cleanly without error.
6. **Scanned / Low-Text Resume**: Document with no text layer $\to$ Flags low-confidence extraction.
7. **Missing Education**: Self-taught engineer $\to$ States *"Not found in resume"*, does not hallucinate degree.
8. **Contradictory Employment Dates**: Overlapping full-time roles $\to$ Flags *"Possible overlapping employment dates"*.
9. **Unsupported Skill Claim**: Claims "Principal Kubernetes Architect" with 0 proof $\to$ Flags *"Unsupported skill claim"*.
10. **Duplicate Resume Detection**: Uploading same document twice $\to$ Caught via cryptographic SHA-256 hash.
11. **Empty Document**: 0-byte file $\to$ Throws explicit actionable validation error.
12. **Invalid File Format**: Unsupported extension (`.exe`) $\to$ Rejected with list of accepted formats (PDF, DOCX, TXT).

---

## 12. Quickstart & Running Tests

### 1. Installation
```bash
git clone https://github.com/Ashaypatakare04/MatchLens-AI.git
cd MatchLens-AI
npm install
```

### 2. Configuration (Optional)
Create `.env.local`:
```env
# Optional: Connect Gemini embeddings and narrative generation.
# If omitted, MatchLens AI runs fully using its built-in deterministic local engine!
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run Both Test Suites
```bash
npm test
```
*Executes both the 12 Edge Cases test suite and the 8 AI Evaluation Benchmarks.*

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view:
- `/` — Landing page with value proposition
- `/dashboard` — Recruiter workspace with active requisitions
- `/evaluation` — AI Evaluation & Benchmark Dashboard (Tests 1–8, Cases A–F, Live Sandbox)
- `/test-suite` — 12 Edge Cases runner
- `/jobs/job-cloudscale-sr-fullstack/candidates` — Candidate leaderboard with Total vs Relevant Experience
- `/jobs/job-cloudscale-sr-fullstack/candidates/cand-alex-rivera` — Evidence citations and requirement breakdown
- `/jobs/job-cloudscale-sr-fullstack/compare?ids=cand-alex-rivera,cand-elena-rostova,cand-david-chen` — Side-by-side comparison matrix

### 5. Build for Production
```bash
npm run build
npm start
```

---

## 13. Concise Judge Demo Script (Under 4 Minutes)

- **0:00–0:30 | Value Proposition & Evaluation Dashboard**:
  - Open `/evaluation`. Show the **AI Benchmark (Tests 1–8)** with 100% win rate against keyword baseline.
  - Explain the core difference: MatchLens credits transferable skills, discounts buzzword lists, and links exact resume proof.
- **0:30–1:00 | Judge Demo Cases**:
  - Switch to the **Judge Demo Cases (A–F)** tab on `/evaluation`.
  - Click **Case A** (Angular/Vue credited to React) and **Case C vs Case D** (Buzzword list penalized to 35% vs Production scale rewarded with 100%).
- **1:00–1:45 | Candidate Leaderboard & Relevant Experience**:
  - Open `/jobs/job-cloudscale-sr-fullstack/candidates`.
  - Point out Match Type badges and **Total vs Relevant Experience** (`Total: 6.2 yrs | Relevant: 6.2 yrs` vs unrelated profiles).
- **1:45–2:30 | Requirement-Level Matrix & Grounded Evidence**:
  - Open candidate detail `/jobs/job-cloudscale-sr-fullstack/candidates/cand-david-chen`.
  - Show the **Requirement-Level Evaluation Matrix** with Categories A–E, exact resume citations, and transferable skill analysis.
- **2:30–3:15 | Recruiter Decision Support & Weight Recalculation**:
  - Click **Adjust Weights**: Change Experience from 25% to 40%, click **Apply & Recalculate**. Notice scores update deterministically in real time.
  - Record a recruiter decision (*Shortlist/Interview*) with private interview screen notes.
- **3:15–4:00 | Automated Reliability Suites**:
  - Navigate to `/test-suite` and demonstrate all 12 edge cases passing.

---

## 14. API Endpoints Reference

| Endpoint | Method | Description |
|---|:---:|---|
| `/api/benchmark` | `GET`, `POST` | Executes the 8 AI evaluation benchmarks comparing Keyword vs MatchLens. |
| `/api/judge-demo` | `GET`, `POST` | Executes the 6 Judge Demonstration Cases (Cases A–F) with real pipeline execution. |
| `/api/jobs` | `GET`, `POST` | Lists requisitions or creates new job openings with extracted requirements. |
| `/api/jobs/[id]/candidates` | `GET` | Fetches candidates ranked by deterministic match score with evidence logs. |
| `/api/jobs/[id]/upload` | `POST` | Uploads and parses PDF/DOCX/TXT resumes through the full dynamic semantic pipeline. |
| `/api/jobs/[id]/rescore` | `POST` | Re-evaluates candidate scores dynamically upon recruiter weight adjustments. |
| `/api/edge-cases/run` | `GET`, `POST` | Executes the 12 Edge Cases & Reliability test suite. |

---

## 15. Honest System Disclosures & Boundaries

- **Recruiter Decision-Support, Not Autonomous Hiring**: MatchLens AI surfaces verified evidence and flags risks. It does not automate hiring or rejections.
- **Configurable Matching Score $\neq$ Probability of Success**: Match scores reflect alignment to recruiter-specified job weights and criteria, not a statistical prediction of job performance.
- **Transferable Credit $\neq$ Production Mastery**: A candidate with strong Angular skills receives transferable credit for React architecture, but will still need an onboarding curve for React-specific hooks and conventions.
- **Text Layer Prerequisite**: Document extraction relies on digital text streams. Scanned image-only PDFs without OCR layers will be appropriately flagged as low-confidence.
