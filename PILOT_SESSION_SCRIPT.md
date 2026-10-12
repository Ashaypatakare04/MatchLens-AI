# MatchLens AI — 45-Minute Recruiter Evaluation Script

**Participant Role**: Recruiting Lead / Technical Recruiter / Hiring Manager  
**Facilitator Role**: Product Validation Lead & Observer  
**Format**: 1-on-1 Remote Video Call with Screen Share  
**Duration**: 45 Minutes  
**Standard Requisition**: *Senior Backend Engineer (Go / Distributed Systems)* (or Participant's Live Role)  

---

## Pre-Session Preparation (5 Minutes Prior to Call)

- [ ] Confirm participant's isolated tenant organization is provisioned and credentials tested.
- [ ] Ensure sample resume batch (10–15 authorized PDF resumes) is ready for download/upload.
- [ ] Confirm facilitator has `/api/admin/monitoring` open on a separate screen to observe queue health.
- [ ] Confirm recording permissions and note-taking template are ready.

---

## Phase 1: Orientation, Consent & Ground Rules (T+00 to T+05 | 5 Mins)

### Facilitator Script:
> *"Welcome, [Recruiter Name]! Thank you for participating in this evaluation session. 
> 
> Today, we are evaluating **MatchLens AI**, an evidence-grounded candidate matching platform. Our goal today is NOT to ask you to blindly trust AI or prove an algorithm is smarter than a human. In fact, our core philosophy is the opposite: **you retain complete decision authority over every hiring choice**.
> 
> We want to learn whether MatchLens provides defensible evidence, saves you real screening time, and earns your trust. If you disagree with a ranking or explanation, that is the most valuable data you can give us.
> 
> **Privacy Note**: All resumes uploaded today are processed in your tenant's private encrypted storage. They are never shared across organizations and are never used to train external AI models. All data can be permanently deleted with a single click at the end of the session."*

### Key Rules Communicated:
1. **Human Autonomy**: The recruiter makes all final hiring calls.
2. **Critical Scrutiny**: Inspect evidence claims; flag any hallucinations or over-inferences.
3. **Think Aloud**: Verbalize what you notice, where you hesitate, and what feels confusing.

---

## Phase 2: Requisition Setup & Calibration (T+05 to T+12 | 7 Mins)

### Action Steps:
1. Recruiter signs in to their isolated tenant portal (`/login`).
2. Clicks **"Create New Job"** (`/jobs/new`).
3. Pastes the job description (either the provided benchmark requisition or their own active role).
4. Submits form; views extracted requirements.

### Facilitator Prompts:
- *"Look at the extracted requirements list: Did the system accurately distinguish between 'Must-Have' (required) and 'Nice-to-Have' (preferred) skills?"*
- *"Notice the scoring weights (Skills: 35%, Experience: 25%, Education: 10%, Projects: 15%, Responsibilities: 15%). Does this align with how you mentally prioritize qualifications for this role?"*
- *(Optional)* Ask recruiter to adjust one weight slider to test calibration.

---

## Phase 3: Batch Upload & Ingestion UX (T+12 to T+18 | 6 Mins)

### Action Steps:
1. Navigate to **"Upload Resumes"** (`/jobs/[id]/upload`).
2. Drag and drop the batch of 10–15 candidate resumes.
3. Observe the asynchronous queue interface.

### Facilitator Observations & Prompts:
- Observe upload latency (HTTP `202 Accepted` returned immediately).
- Monitor progress indicators transitioning: `QUEUED` $\to$ `EXTRACTING` $\to$ `NORMALIZING` $\to$ `MATCHING` $\to$ `COMPLETED`.
- *"While the system is parsing in the background, how does this async queue experience compare to other recruiting software that freezes your screen or makes you wait for each file?"*

---

## Phase 4: Ranking & Defensibility Triad Review (T+18 to T+26 | 8 Mins)

### Action Steps:
1. Navigate to **"Candidate Leaderboard"** (`/jobs/[id]/candidates`).
2. Review the overall candidate leaderboard and scoring tiers (*Strong Match*, *Consider*, *Review Required*).
3. Click into **Candidate #1 (Top Ranked)** (`/jobs/[id]/candidates/[candidateId]`).

### Facilitator Walkthrough:
Introduce the **Defensibility Triad**:
1. **Observed Facts**: Verifiable facts extracted from the document (companies, degrees, dates).
2. **Automated Predictions**: The AI match score breakdown, weighted contributions, and score explanation.
3. **Recruiter Judgments**: The human shortlist/reject decisions.

### Facilitator Prompts:
- *"Look at the Evidence Log: Open the skills evidence. Does the quoted excerpt from the resume actually prove the candidate possesses that skill?"*
- *"Look at the Experience breakdown: Notice the separation between 'Total Years' (e.g., 6 years) and 'Relevant Years' (e.g., 4 years in backend Go). Does this distinction help you evaluate seniority?"*
- *"Do you trust this overall score of [e.g., 88%], or does it feel like a black box?"*

---

## Phase 5: Gaps, Inconsistencies & Compare (T+26 to T+32 | 6 Mins)

### Action Steps:
1. Inspect the **"Potential Inconsistencies & Risk Verification"** section.
2. Inspect **"Missing Qualifications"** and **"Transferable Skills"** (e.g., candidate has GCP; job requested AWS).
3. Navigate back and click **"Compare Candidates"** (`/jobs/[id]/compare`) to compare Candidate #1 and Candidate #2 side-by-side.

### Facilitator Prompts:
- *"Look at the Inconsistency Flag: The system flagged a possible overlap in employment dates. Does this alert feel useful and objective, or does it feel overly accusatory towards the candidate?"*
- *"Look at the Transferable Skill inference: It awarded 70% credit for Kotlin because Java was required. In your hiring bar, is that a valid equivalence or should that be zero credit?"*
- *"On the comparison view: Does seeing their evidence side-by-side help you decide who gets the first phone screen?"*

---

## Phase 6: Recruiter Decisions & Feedback Submission (T+32 to T+37 | 5 Mins)

### Action Steps:
1. Recruiter records a formal hiring disposition on Candidate #1 and Candidate #2:
   - Click **"Shortlist"**, **"Maybe"**, or **"Reject"**.
2. Click the **"Provide Feedback / Disagreement"** button (top right) to open `PilotFeedbackModal`.
3. Select feedback category:
   - If in agreement: Select `Ranking seems correct`.
   - If in disagreement: Select `Relevant candidate ranked too low` or `Evidence does not support claim`.
4. If disagreeing, select the structured reason (e.g., *Relevant experience overlooked*, *Seniority mismatch*).
5. Rate **Perceived Trust** (1–5 stars) and **Perceived Usefulness** (1–5 stars).
6. Enter estimated **Minutes Saved** (e.g., *15 minutes*).
7. Submit feedback.

### Key Observation:
- Note that submitting feedback does NOT artificially inflate or alter the candidate's mathematical match score. Explain this invariance to the recruiter.

---

## Phase 7: Evaluation Report & Defensibility Synthesis (T+37 to T+42 | 5 Mins)

### Action Steps:
1. Navigate to the job's **"Evaluation Report"** (`/jobs/[id]/evaluation`).
2. Review the synthesized summary cards: Total Candidates, Reviewed Count, Shortlisted Count, Disagreement Count.
3. Review the **Defensibility Triad Table**: Candidate Rank vs System Score vs Recruiter Decision.
4. Review the **Common Disagreement Reasons** breakdown.
5. Review the **Ranking Accuracy Metric** (Precision@3) and read the **Statistical Caution Notice**.

### Facilitator Prompt:
- *"Imagine your Engineering Hiring Manager asks: 'Why did you screen Candidate A instead of Candidate B?' Would you feel comfortable sending them this exact report and evidence breakdown?"*

---

## Phase 8: Exit Questionnaire & Commercial Viability (T+42 to T+45 | 3 Mins)

### Debrief Questions:
1. **Workflow Efficiency**: *"Compared to your normal resume screening process, roughly how much time did this workflow save you on this batch?"*
2. **Trust & Explainability**: *"On a scale of 1 to 5, how much do you trust the evidence and explanations provided by the system?"*
3. **Features to Change**: *"What was the single most frustrating or confusing part of the workflow today?"*
4. **Repeat Usage**: *"Would you use MatchLens AI for your next real candidate requisition?"*
5. **Pricing Structure**: *"If this were available today, what pricing model would make sense for your team?"*
   - Per-recruiter monthly seat ($79–$149/month)?
   - Usage-based pay-as-you-go ($0.25–$0.50 per processed resume)?
   - Flat per-active-job pricing ($49/requisition/month)?

### Session Wrap-Up:
- Thank the participant.
- Offer data purge: *"Would you like us to delete all test resumes and requisitions immediately, or leave them in your account for 7 days?"*
- Log session transcript and ratings into the evaluation record.
