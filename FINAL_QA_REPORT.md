# MatchLens AI — Pre-Fix Architecture Audit & QA Report
**Evaluation & Independent Audit for ALGOTHON’26 — Track ALG-AI-01**  
**Date of Audit:** October 2026  
**Auditor Role:** Senior ML/NLP Engineer, AI Product Architect, Hackathon Judge  
**System Evaluated:** MatchLens AI (`https://github.com/Ashaypatakare04/MatchLens-AI`)  
**Core Slogan:** *“Evidence-backed candidate matching for faster, more trustworthy hiring.”*

---

## 1. Executive Summary & Audit Context

An independent evaluation of the original MatchLens AI repository identified 8 fundamental architectural weaknesses:
1. Candidate matching relied heavily on **shallow keyword and frequency overlap** rather than contextual semantic understanding.
2. Scores were perceived as inaccurate because **contextual relevance was weak**.
3. The semantic/AI layer (including Gemini integration) was **not driving the final ranking**, operating as a decorative summary layer while deterministic keyword counting calculated the rank.
4. The system could appear dependent on **static/demo data**.
5. Core AI/NLP workflows were not sufficiently demonstrable on **unseen resumes**.
6. **Transferable skills were represented too simplistically** via rigid static aliases without verifying underlying engineering context.
7. The test suite demonstrated engineering reliability (file formats, edge cases, error handling) but **did not prove AI matching quality**.
8. Surrounding SaaS UI features were well-crafted, but the **core matching intelligence was technically unconvincing**.

This report documents the exhaustive pre-fix audit across the entire codebase, presents the adversarial test matrix of observed failures with exact evidence, and specifies the exact technical blueprints for remediation before any production code was refactored.

---

## 2. Comprehensive Codebase Audit Findings

### 2.1 Resume Extraction Pipeline (`lib/extractor/resume-extractor.ts`, `lib/parsers/document-extractor.ts`)
- **Strengths**: Robust multi-format parsing for PDF (via `unpdf`), DOCX (via `mammoth`), and plaintext; cryptographic SHA-256 deduplication; section partition heuristics.
- **Vulnerabilities**:
  - Position headers on a single line with colon-delimited duty text (e.g. `Senior Software Engineer at Nexus (Jan 2021 - Present): Built React and Node.js microservices...`) failed to populate the `description` field, leaving `description: ""` and dumping inline duties into the `company` field.
  - Section partitioner fell back to parsing the entire document text for `projects` when no dedicated projects header existed, resulting in spurious project extractions (e.g., hyphenated titles like `"Senior Full-Stack Engineer"` parsed as a project named `"Senior Full"`).
  - Lack of fine-grained evidence attribution: failed to distinguish whether a technology occurred within employment duties, personal projects, or an isolated skills list.

### 2.2 Job Requirement Extraction (`lib/extractor/job-extractor.ts`)
- **Strengths**: Regex extraction identifying required skills, preferred skills, minimum experience years, education, and bulleted responsibilities.
- **Vulnerabilities**:
  - Taxonomy was restricted to exact keyword sets without broader subdiscipline recognition (e.g., missed modern tooling like Terraform, ArgoCD, Fastify, Vitest).
  - Required skills were treated as binary presence/absence flags with no weighting by domain centrality.

### 2.3 Skill Normalization & Transferable Skills (`lib/normalization/skill-normalizer.ts`)
- **Strengths**: Normalized basic aliases (e.g., `React.js` $\to$ `React`, `PostgreSQL` $\to$ `PostgreSQL`).
- **Vulnerabilities**:
  - Transferable skill logic relied on static lookup pairs without inspecting the surrounding engineering context.
  - Did not enforce whether a candidate transferring from Angular $\to$ React had experience with component state management or single-page application lifecycles.
  - Did not enforce a mathematical cap on transferable credit: transferable matches could improperly receive equal credit to direct production experience.

### 2.4 Candidate Matching Engine & Scoring (`lib/engine/matcher.ts`, `lib/engine/analyzer.ts`)
- **Strengths**: Deterministic transparent scoring formula (`Skills * 30% + Experience * 25% + Responsibilities * 20% + Projects * 15% + Education * 10%`); configurable recruiter weights modal.
- **Vulnerabilities**:
  - **No Real Semantic Layer in Ranking**: Matching relied on `skillSet.has(targetSkill.toLowerCase())` token inclusion. The Gemini API was only invoked downstream for text generation, meaning the actual candidate rank was 100% keyword-driven.
  - **Evidence Blindness**: A single mention of `"Kubernetes"` in a skills inventory received identical skill credit to 4 years of operating production Kubernetes clusters on AWS EKS.
  - **Total vs Relevant Experience Conflation**: Experience scoring used cumulative calendar tenure (`candidate.totalExperienceYears`), failing to isolate domain-relevant software engineering experience from unrelated careers (e.g., 10 years of retail store management received 10 years of experience credit).
  - **Aggregated Scoring**: Calculated `overall_score = matched_skills / total_skills` rather than evaluating each requirement independently with confidence, evidence citations, and match categories.

### 2.5 Consistency Checker (`lib/engine/consistency-checker.ts`)
- **Strengths**: High-value bonus feature detecting date overlaps, ungrounded summary claims, and tenure mismatches.
- **Vulnerabilities**:
  - Flags operated on coarse text rules without cross-referencing specific evidence levels.

### 2.6 Demo Data vs Uploaded Resumes (`lib/demo-data.ts`, `app/jobs/[id]/upload/page.tsx`)
- **Strengths**: Diverse synthetic candidate pool representing 10 archetypes (perfect, poor, junior, inconsistent, transferable, messy).
- **Vulnerabilities**:
  - Risk of appearing static: candidate records stored pre-baked scores, leading evaluators to question whether uploaded resumes followed the identical pipeline as seeded profiles.

### 2.7 Test Suite (`scripts/run-edge-cases.ts`, `lib/edge-cases.ts`)
- **Strengths**: Tested 12 edge cases covering 0-byte files, malware extensions, hash duplicates, OCR warnings, and date anomalies.
- **Vulnerabilities**:
  - **Zero AI Matching Benchmarks**: The test suite validated defensive software engineering, but provided zero proofs that semantic matching made superior hiring decisions compared to simple `grep` or ATS keyword matching.

---

## 3. Adversarial Test Matrix & Documented Failures

To prove where keyword matching fails, we constructed an adversarial test matrix of 8 core technical scenarios designed to stress-test semantic understanding against token matching:

### 3.1 Test Matrix Overview

| Test # | Job Requirement | Candidate Resume Excerpt | Keyword Baseline Result | MatchLens Target Result | Failure Type Documented |
|:---:|---|---|:---:|:---:|---|
| **1** | `"React development"` | *"Senior Frontend Engineer with 5 years experience architecting Angular and Vue component systems with responsive state management."* | **0 / 100** (REJECTED) | **$\ge 70$ / 100** (Transferable) | **Fatal False Negative**: Candidate rejected because framework vocabulary differed despite identical component architecture. |
| **2** | `"AWS"` | *"Cloud Systems Engineer managing enterprise Microsoft Azure infrastructure, configuring virtual networks, IAM roles, and compute autoscaling."* | **0 / 100** (REJECTED) | **$\ge 75$ / 100** (Transferable) | **Fatal False Negative**: Enterprise cloud engineer rejected due to cloud vendor naming difference. |
| **3** | `"PostgreSQL"` | *"Database Engineer with 6 years experience optimizing MySQL databases, relational schemas, composite indexing, and ACID transactions."* | **0 / 100** (REJECTED) | **$\ge 75$ / 100** (Transferable) | **Fatal False Negative**: Relational database engineer rejected despite mastering schemas, indexes, and ACID guarantees. |
| **4** | `"REST API development"` | *"Designed scalable backend services, microservice architecture, and high-throughput HTTP APIs for distributed clients."* | **0 / 100** (REJECTED) | **$\ge 75$ / 100** (Transferable) | **Fatal False Negative**: Paraphrased equivalent phrasing rejected by exact string matching. |
| **5** | `"Kubernetes"` | *Skills: React, HTML, CSS, JavaScript, Kubernetes.<br>Work: Junior Frontend Developer building static marketing pages in HTML/CSS.* | **100 / 100** (EXACT MATCH) | **$\le 40$ / 100** (Level 1 Penalty) | **Fatal False Positive**: Unsubstantiated buzzword in skills list awarded full credit despite zero production experience. |
| **6** | `"Kubernetes"` | *"Designed and operated Kubernetes clusters on AWS EKS serving 15M daily production requests with 99.99% availability."* | **100 / 100** (EXACT MATCH) | **100 / 100** (Level 5 Grounded) | **Evidence Quality Equalization**: Keyword matcher gave identical score to Test 5 and Test 6; failed to distinguish buzzword from production scale. |
| **7** | `"Machine Learning"` | *"Built predictive models using supervised learning algorithms and trained classifiers to forecast churn with 91% accuracy."* | **50 / 100** (Token Overlap) | **$\ge 60$ / 100** (Semantic Concept) | **Semantic Subdiscipline Ignorance**: Token matcher only matched `"learning"`, missing the parent ML domain. |
| **8** | `"CI/CD"` | *"Automated build, test and deployment pipelines across multi-stage staging and production container environments."* | **0 / 100** (REJECTED) | **$\ge 75$ / 100** (Transferable) | **Fatal False Negative**: Qualified DevOps engineer rejected because resume said "Automated deployment pipelines" instead of "CI/CD". |

### 3.2 Experience Domain Conflation Failure
- **Scenario**: Candidate with 10 years experience as a Retail Store Manager applying for Senior Full-Stack Engineer.
- **Original Code Result**: Awarded high experience score based on 10 cumulative years tenure, failing to recognize that relevant technical engineering tenure was 0.0 years.
- **Root Cause**: `lib/engine/matcher.ts` used `candidate.totalExperienceYears` directly in experience scoring without filtering by role domain or technology overlap.

---

## 4. Root Causes in Pre-Fix Code

1. **`lib/engine/matcher.ts`**:
   - Skills evaluated via:
     ```typescript
     const hasDirect = candidateSkills.some(s => s.toLowerCase() === req.toLowerCase());
     ```
     This strictly penalized paraphrasing, synonyms, and architectural counterparts.
   - Skill credit was binary: any appearance in the resume counted equally, ignoring whether it was listed in a skills summary or proven in enterprise production workloads.
2. **`lib/engine/ai-service.ts`**:
   - Only called *after* candidate scoring to generate cosmetic recruiter prose. The numerical score and rank were completely computed before any AI service was invoked.
3. **`lib/normalization/skill-normalizer.ts`**:
   - Hardcoded pairs had no context-validation hooks (e.g. did not check for `state`, `components`, or `virtual dom` before transferring Angular to React).
4. **Lack of an AI Evaluation Benchmark**:
   - No benchmark suite existed to measure semantic accuracy, false positives, false negatives, or to compare keyword matching against semantic matching.

---

## 5. Exact Recommended Architecture & Remediation Plan

To completely address the evaluator's critique without faking semantic intelligence, the following engineering blueprint must be executed:

```
JOB DESCRIPTION                           CANDIDATE RESUME
      │                                          │
      ▼                                          ▼
Requirement Extraction (Job Extractor)    Multi-Format Document Parsing (unpdf / mammoth)
      │                                          │
      ▼                                          ▼
Requirement Classification                Profile Normalization & Timeline Resolver
(Required / Preferred / Min Exp)                 │
      │                                          ▼
      ├───────────────────┬──────────────────────┘
                          │
                          ▼
            Contextual Evidence Classifier (Levels 0 – 5)
            [lib/engine/evidence-classifier.ts]
                          │
                          ▼
            Contextual Transferable Engine (Architectural Counterparts)
            [lib/normalization/transferable-engine.ts]
                          │
                          ▼
            Reusable Semantic Similarity Layer
            (Gemini Embeddings OR 12-Domain Orthogonal Projection Fallback)
            [lib/engine/semantic-similarity.ts]
                          │
                          ▼
            Requirement-Level Evaluator (Categories A – E)
            [lib/engine/requirement-matcher.ts]
                          │
                          ▼
            Separation of Total vs Relevant Experience
            [lib/engine/matcher.ts]
                          │
                          ▼
            Deterministic Weighted Scorer (Recruiter Weights)
            [lib/engine/matcher.ts]
                          │
                          ▼
            Evidence Citations & Grounded Explanations
            [lib/engine/explanation-generator.ts]
                          │
                          ▼
            AI Evaluation Dashboard & Benchmark Suite
            [/evaluation + scripts/run-ai-benchmark.ts]
```

### Specific Technical Requirements for Remediation:
1. **Mathematical Semantic Similarity Layer (`lib/engine/semantic-similarity.ts`)**:
   - Cloud mode using Gemini `text-embedding-004`.
   - Deterministic offline fallback using 12 orthogonal domain clusters, n-gram Jaccard, TF-IDF weighting, and asymmetric fuzzy containment (`computeDomainContainment`).
   - Zero random numbers, zero fake cosine vectors.
2. **5-Level Contextual Evidence Quality Hierarchy (`lib/engine/evidence-classifier.ts`)**:
   - Level 0 (0.0x), Level 1 (0.35x), Level 2 (0.65x), Level 3 (0.85x), Level 4 (0.95x), Level 5 (1.0x).
   - Penalize buzzwords; reward quantified production impact.
3. **Contextual Transferable Skills Engine (`lib/normalization/transferable-engine.ts`)**:
   - Map Angular/Vue $\to$ React, Azure $\to$ AWS, MySQL $\to$ PostgreSQL, HTTP APIs $\to$ REST APIs, Automated Pipelines $\to$ CI/CD.
   - Enforce engineering context verification terms and cap credit at $0.65 - 0.80$ max.
4. **Requirement-Level Matching (`lib/engine/requirement-matcher.ts`)**:
   - Return `{ requirement, category, match_type, semantic_score, evidence_score, experience_score, confidence, evidence, explanation }` for every single job requirement.
5. **Separate Total vs Relevant Experience**:
   - Filter work history by engineering title and technology overlap so unrelated careers yield 0.0 relevant software years.
6. **Executable AI Evaluation Benchmark Suite (`lib/engine/benchmark-service.ts`, `/evaluation`)**:
   - Implement the 8 adversarial test scenarios in executable code and demonstrate a 100% win rate over keyword matching.
7. **Ensure Single Unified Pipeline**:
   - Ensure demo candidates, judge demonstration cases, and newly uploaded resumes run through the exact same dynamic code paths.
8. **Automated Test Script Integration**:
   - Update `package.json` to run both the 12 Edge Cases test suite and the new 8 AI Evaluation Benchmarks under `npm test`.

---

*End of Pre-Fix Audit Report. See POST_FIX_QA_REPORT.md for post-implementation verification results.*
