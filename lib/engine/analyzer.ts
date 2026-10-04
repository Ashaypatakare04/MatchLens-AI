import {
  CandidateProfile,
  Job,
  MatchAnalysis,
  ScoringWeights,
} from "../types";
import { matchCandidateAgainstJob } from "./matcher";
import { checkProfileConsistency } from "./consistency-checker";
import { calculateOverallScore } from "./scorer";
import { generateExplainableSummary } from "./explanation-generator";

/**
 * End-to-end pipeline: Evaluates a candidate profile against a job description.
 */
export function analyzeCandidate(
  candidate: CandidateProfile,
  job: Job,
  customWeights?: ScoringWeights
): MatchAnalysis {
  const weights = customWeights || job.weights;

  // 1. Requirements matching
  const {
    skillsResult,
    experienceResult,
    educationResult,
    projectResult,
    responsibilityAlignment,
    strongMatches,
    missingRequirements,
    evidenceLog,
  } = matchCandidateAgainstJob(candidate, job);

  // 2. Consistency & Inconsistency Detection (Bonus ALG-AI-01)
  const potentialInconsistencies = checkProfileConsistency(candidate);

  // Add inconsistency warnings to evidenceLog
  for (const incon of potentialInconsistencies) {
    evidenceLog.push({
      id: `ev-incon-${incon.id}`,
      claimOrRequirement: incon.flag,
      evidenceText: `${incon.claim} -> ${incon.evidence}`,
      section: "Inconsistency Check",
      quality: "Moderate",
      nature: "Warning requiring verification",
    });
  }

  // 3. Deterministic Configurable Weighted Scoring
  const { overallScore, scoreBreakdown, weightedContributions } = calculateOverallScore(
    skillsResult.score,
    experienceResult.score,
    educationResult.score,
    projectResult.score,
    responsibilityAlignment,
    weights
  );

  // 4. Grounded AI Explanation & Recommendation
  const { recommendation, explanation } = generateExplainableSummary(
    candidate,
    job,
    skillsResult,
    experienceResult,
    overallScore,
    potentialInconsistencies
  );

  return {
    candidateId: candidate.id,
    jobId: job.id,
    overallScore,
    scoreBreakdown,
    weightedContributions,
    skillsAnalysis: skillsResult,
    experienceAnalysis: experienceResult,
    educationAnalysis: educationResult,
    projectAnalysis: projectResult,
    responsibilityAlignment,
    strongMatches,
    missingRequirements,
    potentialInconsistencies,
    evidenceLog,
    aiRecommendation: recommendation,
    aiExplanation: explanation,
    recruiterDecision: "unreviewed",
    recruiterNotes: "",
    analyzedAt: new Date().toISOString(),
  };
}
