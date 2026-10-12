export interface ScoringWeights {
  skills: number; // e.g. 35
  experience: number; // e.g. 25
  education: number; // e.g. 10
  projects: number; // e.g. 15
  responsibilities: number; // e.g. 15
}

export interface ExtractedJobRequirements {
  requiredSkills: string[];
  preferredSkills: string[];
  minExperienceYears: number;
  educationRequirement: string;
  importantKeywords: string[];
  keyResponsibilities: string[];
  requirementsList: string[];
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  workMode: "Remote" | "Hybrid" | "On-site";
  employmentType: "Full-time" | "Contract" | "Part-time" | "Internship";
  rawDescription: string;
  requirements: ExtractedJobRequirements;
  weights: ScoringWeights;
  createdAt: string;
  updatedAt: string;
}

export interface WorkExperienceItem {
  id: string;
  title: string;
  company: string;
  startDate: string; // e.g. "2021-01" or "Jan 2021"
  endDate: string; // e.g. "2023-12" or "Present"
  isCurrent?: boolean;
  calculatedDurationMonths: number;
  description: string;
  achievements?: string[];
  technologies?: string[];
  rawText?: string;
}

export interface EducationItem {
  degree: string;
  institution: string;
  fieldOfStudy?: string;
  graduationYear?: number;
  rawText?: string;
}

export interface ProjectItem {
  title: string;
  description: string;
  technologies: string[];
  impact?: string;
  rawText?: string;
}

export interface CertificationItem {
  name: string;
  issuer?: string;
  year?: string;
  rawText?: string;
}

export interface CandidateProfile {
  id: string;
  jobId: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  education: EducationItem[];
  totalExperienceYears: number;
  statedExperienceYears?: number;
  workHistory: WorkExperienceItem[];
  skills: string[];
  certifications: CertificationItem[];
  projects: ProjectItem[];
  achievements: string[];
  rawResumeText: string;
  fileName: string;
  fileType: "pdf" | "docx" | "txt";
  fileSize: number;
  fileHash: string;
  parsingConfidence: "high" | "medium" | "low";
  parsingWarnings: string[];
  extractedAt: string;
}

export type InconsistencyType =
  | "unsupported_claim"
  | "contradictory_dates"
  | "experience_mismatch"
  | "gap_or_overlap";

export interface PotentialInconsistency {
  id: string;
  type: InconsistencyType;
  severity: "medium" | "high";
  flag: string; // e.g. "Unsupported skill claim", "Possible overlapping employment dates"
  claim: string; // what the candidate claimed
  evidence: string; // what was found or missing in the resume
  recommendation: string; // neutral verification advice for recruiter
}

export interface MatchedSkill {
  skill: string;
  targetSkill: string;
  matchType: "exact" | "synonym" | "transferable";
  evidence: string;
  confidence: number;
}

export interface SkillsMatchResult {
  score: number;
  requiredMatched: MatchedSkill[];
  requiredMissing: string[];
  preferredMatched: MatchedSkill[];
  preferredMissing: string[];
  transferableSkills: Array<{
    candidateSkill: string;
    targetSkill: string;
    rationale: string;
  }>;
}

export type RequirementMatchType =
  | "DIRECT MATCH"
  | "TRANSFERABLE / PARTIAL MATCH"
  | "WEAK / RELATED EVIDENCE"
  | "MISSING"
  | "CONFLICTING / UNCERTAIN";

export interface RequirementMatchItem {
  requirement: string;
  category: "required_skill" | "preferred_skill" | "responsibility" | "experience" | "education";
  matchType: RequirementMatchType;
  semanticScore: number; // 0 - 100
  evidenceScore: number; // 0 - 100
  experienceScore: number; // 0 - 100
  confidence: "High" | "Moderate" | "Low";
  evidence: string;
  explanation: string;
  evidenceLevel?: number; // 0 - 5
  scoreContribution?: number; // e.g. +7.4
}

export interface ExperienceMatchResult {
  score: number;
  totalYearsDetected: number;
  relevantExperienceYears: number; // Disaggregated relevant years vs total
  requiredYears: number;
  status: "exceeds" | "meets" | "below";
  relevantRoles: Array<{
    title: string;
    company: string;
    duration: string;
    relevanceNote: string;
  }>;
  evidence: string;
}

export interface EducationMatchResult {
  score: number;
  meetsRequirement: boolean;
  degreeMatch: string;
  evidence: string;
}

export interface ProjectMatchResult {
  score: number;
  relevantProjects: Array<{
    title: string;
    techUsed: string[];
    alignmentNote: string;
  }>;
  evidence: string;
}

export interface ResponsibilityMatchItem {
  responsibility: string;
  candidateEvidence: string;
  matchLevel: "strong" | "moderate" | "weak";
}

export interface EvidenceItem {
  id: string;
  claimOrRequirement: string;
  evidenceText: string;
  section: string;
  quality: "Strong" | "Moderate" | "Limited";
  nature: "Extracted fact" | "Computed metric" | "AI interpretation" | "Warning requiring verification";
}

export type RecruiterDecision =
  | "shortlisted"
  | "maybe"
  | "rejected"
  | "unreviewed"
  | "request_interview"
  | "request_code_sample"
  | "needs_verification";

export type PipelineStage =
  | "screening"
  | "technical_review"
  | "interview"
  | "offer"
  | "archived";

export type RecruiterFeedbackReason =
  | "required_skill_too_strict"
  | "equivalent_experience"
  | "weight_mismatch"
  | "project_undervalued"
  | "culture_fit_concern"
  | "other";

export interface RecruiterFeedback {
  overrideType: "promoted_above_score" | "demoted_below_score" | "neutral_calibration";
  reason: RecruiterFeedbackReason;
  comment?: string;
  timestamp: string;
  recruiterId: string;
}

export type AIRecommendation = "Strong Match" | "Consider" | "Review Required" | "Low Alignment";

export interface MatchAnalysis {
  candidateId: string;
  jobId: string;
  overallScore: number; // 0 - 100
  scoreBreakdown: {
    skills: number;
    experience: number;
    education: number;
    projects: number;
    responsibilities: number;
  };
  weightedContributions: {
    skills: number;
    experience: number;
    education: number;
    projects: number;
    responsibilities: number;
  };
  skillsAnalysis: SkillsMatchResult;
  experienceAnalysis: ExperienceMatchResult;
  educationAnalysis: EducationMatchResult;
  projectAnalysis: ProjectMatchResult;
  responsibilityAlignment: ResponsibilityMatchItem[];
  requirementMatches?: RequirementMatchItem[];
  totalExperienceYears?: number;
  relevantExperienceYears?: number;
  matchingEngine?: "gemini" | "local_semantic";
  strongMatches: string[];
  missingRequirements: string[];
  potentialInconsistencies: PotentialInconsistency[];
  evidenceLog: EvidenceItem[];
  aiRecommendation: AIRecommendation;
  aiExplanation: string;
  recruiterDecision: RecruiterDecision;
  recruiterNotes: string;
  pipelineStage?: PipelineStage;
  recruiterFeedback?: RecruiterFeedback;
  decisionTimestamp?: string;
  analyzedAt: string;
}

export interface CandidateWithMatch {
  candidate: CandidateProfile;
  match: MatchAnalysis;
}

export type ProcessingStep =
  | "uploading"
  | "extracting"
  | "normalizing"
  | "analyzing"
  | "matching"
  | "checking_inconsistencies"
  | "generating_explanation"
  | "complete"
  | "failed";

export interface ProcessingStatus {
  step: ProcessingStep;
  progressPercent: number;
  currentCandidate?: string;
  totalCandidates?: number;
  processedCount?: number;
  message: string;
  errors?: string[];
}

export interface EdgeCaseTestCase {
  id: string;
  name: string;
  scenario: string;
  expectedBehavior: string;
  resumeFileOrText: string;
  testType:
    | "perfect"
    | "poor"
    | "missing_required_skill"
    | "transferable_skills"
    | "messy_resume"
    | "scanned_low_text"
    | "missing_education"
    | "contradictory_dates"
    | "unsupported_claim"
    | "duplicate_resume"
    | "empty_document"
    | "invalid_file"
    | "prompt_injection"
    | "oversized_file"
    | "path_traversal";
  result?: {
    passed: boolean;
    detectedFlags: string[];
    score: number;
    details: string;
  };
}

export type PilotFeedbackCategory =
  | "ranking_correct"
  | "relevant_ranked_too_low"
  | "irrelevant_ranked_too_high"
  | "evidence_unsupported"
  | "qualification_missing"
  | "transferable_skill_incorrect"
  | "inconsistency_misleading"
  | "workflow_confusing"
  | "processing_failed"
  | "other";

export type PilotDisagreementReason =
  | "relevant_experience_overlooked"
  | "transferable_skill_incorrect"
  | "qualification_misunderstood"
  | "unsupported_candidate_claim"
  | "seniority_mismatch"
  | "duration_misinterpreted"
  | "other";

export interface PilotFeedbackEntry {
  id: string;
  organizationId: string;
  jobId: string;
  candidateId?: string;
  analysisId?: string;
  userId: string;
  userName?: string;
  category: PilotFeedbackCategory;
  disagreementReason?: PilotDisagreementReason;
  systemRank?: number;
  systemScore?: number;
  recruiterDecision?: RecruiterDecision;
  comment?: string;
  perceivedTrustScore?: number; // 1 - 5
  perceivedUsefulnessScore?: number; // 1 - 5
  timeSavedMinutes?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface JobEvaluationReport {
  job: {
    id: string;
    title: string;
    company: string;
    requirementsUsed: {
      requiredSkills: string[];
      preferredSkills: string[];
      minExperienceYears: number;
      responsibilities: string[];
    };
  };
  candidateRankings: Array<{
    rank: number;
    candidateId: string;
    candidateName: string;
    overallScore: number;
    aiRecommendation: AIRecommendation;
    recruiterDecision: RecruiterDecision;
    pipelineStage?: PipelineStage;
    missingRequirementsCount: number;
    strongMatchesCount: number;
    potentialInconsistenciesCount: number;
    relevantExperienceYears?: number;
  }>;
  summary: {
    totalCandidates: number;
    reviewedCount: number;
    shortlistedCount: number;
    maybeCount: number;
    rejectedCount: number;
    unreviewedCount: number;
    decisionCompletionRatePercent: number;
    rankingDisagreementsCount: number;
    evidenceFeedbackCount: number;
    averageTrustScore: number | null;
    averageUsefulnessScore: number | null;
    totalReportedTimeSavedMinutes: number;
  };
  disagreements: Array<{
    candidateId: string;
    candidateName: string;
    systemRank: number;
    systemScore: number;
    recruiterDecision: RecruiterDecision;
    category: PilotFeedbackCategory;
    disagreementReason?: PilotDisagreementReason;
    comment?: string;
    createdAt: string;
  }>;
  evidenceFeedback: Array<{
    candidateId?: string;
    candidateName?: string;
    category: PilotFeedbackCategory;
    comment?: string;
    createdAt: string;
  }>;
  commonDisagreementReasons: Record<string, number>;
  processingMetrics: {
    totalProcessed: number;
    averageProcessingDurationMs: number | null;
    failureRatePercent: number;
  };
  rankingMetrics: {
    precisionAt3: number | null;
    precisionAt5: number | null;
    sampleSize: number;
    hasSufficientData: boolean;
    limitationsNotice: string;
  };
  factsVsPredictionsVsJudgments: {
    observedFacts: string[];
    automatedPredictions: string[];
    recruiterJudgments: string[];
  };
}

