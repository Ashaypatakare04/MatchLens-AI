# MatchLens AI — Evidence-Backed Candidate Matching System
**ALGOTHON’26 — Track ALG-AI-01: AI Resume & Job Matching System**

> **MatchLens AI — Evidence-backed candidate matching for faster, more trustworthy hiring.**  
> *MatchLens doesn't just rank candidates. It explains the evidence behind every match and flags claims that require verification.*

---

## 1. Problem

Recruiters receive hundreds of resumes for a single role. Traditional Applicant Tracking Systems (ATS) rely on naive keyword filters that reward keyword-stuffed resumes, penalize qualified candidates with transferable skills, hallucinate arbitrary confidence percentages, and completely overlook timeline discrepancies or exaggerated claims.

---

## 2. Solution

**MatchLens AI** is an evidence-backed candidate matching and recruiter intelligence platform. It analyzes resumes against structured job requirements, explains the exact resume proof behind every score, detects potential inconsistencies (such as unsupported skill claims, date overlaps, and tenure mismatches), and provides transparent, configurable scoring with human-in-the-loop decision tracking.

---

## 3. Core Features

- **Multi-Format Resume Upload**: Drag-and-drop parsing for PDF, DOCX, and TXT documents.
- **Job Requirement Extraction**: Automatically extracts required skills, preferred skills, minimum experience, education requirements, and core responsibilities from unstructured job descriptions.
- **Interactive Requirement Fine-Tuning**: Recruiters can edit, add, or remove requirement pills before starting evaluation.
- **Information Extraction & Normalization**: Canonicalizes skill aliases (`React.js` $\to$ `React`, `PostgreSQL` $\to$ `PostgreSQL`) and maps transferable skills (Angular/Vue $\to$ React).
- **Candidate Scoring & Ranking**: Generates transparent matching scores out of 100 across 5 configurable dimensions.
- **Evidence-Backed Explanations**: Every skill match and experience claim links directly to extracted resume snippets with source section and evidence strength indicators (*Strong*, *Moderate*, *Limited*).
- **Search & Multi-Dimensional Filtering**: Search by name, skill, or company; filter by score thresholds, recommendations, inconsistency flags, and recruiter decisions.
- **Side-by-Side Candidate Comparison**: Compare 2–4 candidates simultaneously with objective criteria-based ranking explanations.
- **Potential Inconsistency Detection (ALG-AI-01 Bonus)**:
  - *Unsupported skill claims* (e.g., claiming "Expert in Kubernetes" without projects or roles).
  - *Possible overlapping employment dates* (concurrent full-time roles).
  - *Experience claim verification* (stated summary years exceeding extracted timeline).
- **Human-in-the-Loop Decision Tracking**: Distinct separation between AI recommendations and human recruiter actions (*Shortlist*, *Maybe*, *Reject*, and interview notes).
- **Automated Reliability Test Suite**: Integrated runner testing 12 real edge cases.

---

## 4. Hybrid AI + Deterministic Architecture

MatchLens AI is deliberately designed with a clear separation between its AI/semantic layer and its deterministic computation layer. **The final candidate score is never arbitrarily decided by an LLM.**

```
Recruiter
   │
   ▼
Next.js Web Application
   │
   ▼
Job / Resume Input Layer
   │
   ▼
Document Extraction (PDF via unpdf, DOCX via mammoth, TXT)
   │
   ▼
Information Normalization (Skill taxonomy & chronological timeline resolver)
   │
   ├── AI / Semantic Analysis
   │     ├── Job requirement extraction
   │     ├── Resume semantic comprehension
   │     ├── Transferable skills mapping
   │     └── Grounded explanation narrative
   │
   ├── Matching Engine
   │     ├── Skill Matching (exact, synonym, transferable)
   │     ├── Experience Analysis (verified non-overlapping tenure)
   │     ├── Responsibility Alignment
   │     ├── Evidence Retrieval (snippet citation logging)
   │     └── Consistency Checks (claim vs evidence verification)
   │
   ▼
Deterministic Scoring Layer (Configurable weighted sum formula)
   │
   ▼
Ranked Candidates Dashboard
   │
   ▼
Evidence + Explanation View
   │
   ▼
Recruiter Decision (Shortlist / Maybe / Reject + Notes)
```

### Architectural Layer Responsibilities

| Layer | Responsibility | Why It's Separated |
|---|---|---|
| **AI / Semantic Layer** | • Requirement extraction from job description<br>• Resume layout understanding<br>• Semantic relevance & transferable skills graph<br>• Grounded executive explanation generation | Best suited for natural language comprehension and qualitative synthesis. |
| **Deterministic Layer** | • Score calculation from configured weights<br>• Chronological timeline & tenure math<br>• Date overlap detection (calendar math)<br>• SHA-256 duplicate resume detection<br>• Rule-based consistency audits | Eliminates black-box scoring, hallucinations, and non-reproducible ranking changes. |

---

## 5. Technology Stack

- **Framework**: Next.js 16 (App Router, Turbopack, React 19)
- **Language**: TypeScript 5 (Strict type checking across all data contracts)
- **Styling**: Tailwind CSS v4, Lucide React Icons
- **Document Parsers**:
  - `unpdf` (Canvas-free edge/node PDF extractor)
  - `mammoth` (Pure JS DOCX document parser)
- **AI / LLM Layer**: Google Gemini 2.5 Flash (`@google/genai`) with seamless local hybrid deterministic fallback
- **Persistence**: File-backed local storage (`.data/db.json`) with in-memory caching
- **Testing**: Integrated 12-scenario Edge Cases & Reliability test suite (`/test-suite`)

---

## 6. AI Components & External APIs

- **Google Gemini 2.5 Flash API (`@google/genai`)**:
  - Used optionally for qualitative recruiter summary enrichment and tailored technical screening questions when `GEMINI_API_KEY` is provided.
- **Local Hybrid Deterministic Engine (Zero External Dependencies)**:
  - If no external API key is set, the system automatically uses its local deterministic NLP taxonomy and matching engine. All scoring, parsing, consistency checks, citations, and comparisons run offline with zero failure risk.

---

## 7. Demo Dataset

The application includes a pre-seeded, realistic demo dataset designed for a complete 2–4 minute judge demonstration:

- **1 Realistic Requisition**: *Senior Full-Stack & Cloud Platform Engineer* at *CloudScale Technologies*.
  - Required Skills: React, TypeScript, Node.js, PostgreSQL, Docker (5+ years exp).
  - Preferred Skills: Kubernetes, AWS, GraphQL, Tailwind CSS, Redis.
- **10 Synthetic Candidate Resumes** exhibiting diverse profiles:
  1. **Alex Rivera** (Score: 94/100): Exceptional match, satisfies all 5 required skills, 6.2 yrs verified tenure.
  2. **Elena Rostova** (Score: 87/100): Strong match, Master's degree, verified 5.1 yrs tenure.
  3. **David Chen** (Score: 77/100): Strong transferable skills (Angular/Vue credited toward React; MySQL toward PostgreSQL).
  4. **Marcus Brody** (Score: 56/100): Missing required skills (strong frontend UI, lacks Node.js and PostgreSQL).
  5. **Sarah Jenkins** (Score: 61/100): **Unsupported skill claim** (claims "Principal Kubernetes Architect", but 0 Kubernetes projects or duties).
  6. **Vikram Malhotra** (Score: 71/100): **Possible overlapping employment dates** (20-month full-time overlap between Acrobatix and BluePeak).
  7. **Jessica Taylor** (Score: 67/100): **Experience claim requires verification** (claims 8+ years experience, timeline covers 2.8 years).
  8. **Jordan Blake** (Score: 78/100): **Messy resume layout** (unconventional ASCII borders and non-standard delimiters parsed cleanly).
  9. **Carlos Gomez** (Score: 42/100): Junior candidate (1.2 years experience against 5+ year requirement).
  10. **Amina Al-Mansoor** (Score: 79/100): Cloud & distributed systems specialist with transferable backend background.

*Note: All demo candidates and company names are synthetic data created for evaluation purposes.*

---

## 8. Setup & Quickstart Instructions

### 1. Installation
```bash
git clone https://github.com/Ashaypatakare04/MatchLens-AI.git
cd MatchLens-AI
npm install
```

### 2. Environment Variables (Optional)
Create `.env.local` in the project root:
```env
# Optional: Connect Gemini 2.5 Flash for live LLM enrichment.
# If omitted, MatchLens AI runs fully using its built-in hybrid deterministic engine!
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
npm start
```

---

## 9. Recommended 2–4 Minute Judge Demo Sequence

1. **Landing Page (`/`)**:
   - Review value proposition: *"Evidence-backed candidate matching for faster, more trustworthy hiring."*
   - Observe the 5-stage live pipeline preview (*Job Requirements $\to$ Candidate Analysis $\to$ Ranked Shortlist $\to$ Grounded Evidence $\to$ Inconsistency Flags*).
2. **One-Click Demo Loading**:
   - Click **"Load Demo Dataset"** in the top navbar.
   - Instantly loads the CloudScale job and 10 realistic candidates.
3. **Ranked Candidate Dashboard (`/jobs/.../candidates`)**:
   - Review top rankings: Alex Rivera #1 (94/100), Elena Rostova #2 (87/100), David Chen #3 (77/100 with transferable skill credit).
   - Point out the amber badges `⚠ Flagged Claim` on Sarah Jenkins and Vikram Malhotra.
4. **Deep Candidate Inspection (`/jobs/.../candidates/[id]`)**:
   - Open **Alex Rivera**: Scannable in 15 seconds. Review Overall Match (94/100), Strong Matches, Score Breakdown, Formula Mechanics, Grounded Evidence quotes with source sections, and Experience Timeline.
   - Open **Sarah Jenkins**: View the *Potential Inconsistency: Limited supporting evidence for Kubernetes expertise* card.
   - Open **Vikram Malhotra**: View the *Possible overlapping employment dates* card (20-month full-time overlap).
   - Open **Jessica Taylor**: View the *Experience claim requires verification* card (8+ years stated vs 2.8 years timeline).
5. **Configurable Weight Recalculation**:
   - Click **"Adjust Weights"**. Slide Experience from 25% to 40%. Click **"Normalize to 100%"**, then **"Apply & Recalculate"**.
   - Watch candidate scores deterministically update in real-time.
6. **Side-by-Side Comparison (`/jobs/.../compare`)**:
   - Check boxes for Alex Rivera, Elena Rostova, and David Chen.
   - Click **"Compare Selected Candidates"** to inspect the synchronized matrix with criteria-based ranking explanations.
7. **Human-in-the-Loop Decision**:
   - Toggle recruiter decision to **"Shortlisted"** and save an interview note.
8. **Automated Reliability Test Suite (`/test-suite`)**:
   - Open `/test-suite` and click **"Re-Run All 12 Tests"** to demonstrate automated validation across all 12 edge cases.

---

## 10. Automated Edge Cases & Reliability Suite

The platform includes real automated test cases for all 12 edge case scenarios:

| # | Test Scenario | Input Document | Result | Behavior & Flag Verified |
|---|---|---|---|---|
| 1 | **Perfect Candidate** | Full stack resume with all skills | **PASS** | Score 94/100, 0 missing requirements |
| 2 | **Poor Candidate** | Retail store manager | **PASS** | Score 24/100, Low Alignment recommendation |
| 3 | **Missing Required Skill** | Frontend UI dev lacking Node/Postgres | **PASS** | Caps skill score, flags missing Node.js & Postgres |
| 4 | **Transferable Skills** | Angular/Vue & MySQL engineer | **PASS** | Transferable skill credit + architecture rationale |
| 5 | **Messy Resume** | ASCII delimiters, non-standard layout | **PASS** | Normalized text extraction, zero parser crashes |
| 6 | **Scanned / Low-Text** | Document with no text layer | **PASS** | Flags low-confidence extraction warning |
| 7 | **Missing Education** | Self-taught engineer with no degree | **PASS** | States *"Not found in resume"*, does not fabricate degree |
| 8 | **Contradictory Dates** | Overlapping full-time dates | **PASS** | Flags *"Possible overlapping employment dates"* |
| 9 | **Unsupported Claim** | Claims K8s Architect with 0 evidence | **PASS** | Flags *"Unsupported skill claim"* |
| 10 | **Duplicate Resume** | Identical document uploaded twice | **PASS** | Detected via cryptographic SHA-256 hash |
| 11 | **Empty Document** | 0-byte file | **PASS** | Rejected with actionable recruiter guidance |
| 12 | **Invalid Format** | Binary/unsupported file | **PASS** | Rejected with clear supported formats notice |

---

## 11. Honest Disclosures & System Limitations

- **Decision-Support Tool, Not Autonomous Decision-Maker**: MatchLens AI assists human recruiters; it does not and should not make autonomous hiring decisions.
- **Document Structure Dependency**: Extraction fidelity depends on readable text layers. Non-OCR scans of physical paper documents yield low-confidence flags.
- **Inconsistencies Are Incomplete Inferences**: Flags highlight potential discrepancies for recruiter verification during screens, not definitive evidence of candidate deception.
- **Semantic Similarity $\neq$ Actual Capability**: Transferable skill credits indicate conceptual overlap (e.g. Angular to React), not verified production fluency.

---

## 12. Future Roadmap

- **Advanced Multi-Language OCR**: Integration with AWS Textract or Tesseract for non-digital scanned physical documents.
- **Cross-Requisition Matching**: Match a single uploaded resume across multiple active open positions simultaneously.
- **ATS Webhook Connectors**: Two-way synchronization with Greenhouse, Lever, and Workday APIs.
- **Recruiter Feedback Learning**: Fine-tuning skill weight preferences based on recruiter shortlist actions over time.
