import {
  CandidateProfile,
  Job,
  SkillsMatchResult,
  ExperienceMatchResult,
  PotentialInconsistency,
  AIRecommendation,
  RequirementMatchItem,
} from "../types";

/**
 * Generates an executive summary and explainable rationale for a candidate's match against a job.
 * Grounded in extracted facts, evidence levels, and computed timeline metrics.
 */
export function generateExplainableSummary(
  candidate: CandidateProfile,
  job: Job,
  skillsResult: SkillsMatchResult,
  experienceResult: ExperienceMatchResult,
  overallScore: number,
  inconsistencies: PotentialInconsistency[],
  requirementMatches?: RequirementMatchItem[]
): {
  recommendation: AIRecommendation;
  explanation: string;
} {
  // Determine AI recommendation
  let recommendation: AIRecommendation = "Consider";
  const hasHighInconsistency = inconsistencies.some((i) => i.severity === "high");

  if (hasHighInconsistency || inconsistencies.length >= 2) {
    recommendation = "Review Required";
  } else if (overallScore >= 80 && skillsResult.requiredMissing.length === 0) {
    recommendation = "Strong Match";
  } else if (overallScore >= 65) {
    recommendation = "Consider";
  } else {
    recommendation = "Low Alignment";
  }

  const reqCount = job.requirements.requiredSkills.length;
  const matchedCount = skillsResult.requiredMatched.length;
  const points: string[] = [];

  // 1. Overall Match Summary
  points.push(
    `Overall matching score is ${overallScore}/100 based on configured evaluation weights (Decision Support Score — not automated hiring probability).`
  );

  // 2. Technical Skills & Evidence Grounding
  if (matchedCount === reqCount && skillsResult.requiredMissing.length === 0) {
    points.push(
      `Candidate satisfies all ${reqCount} required technical competencies (${skillsResult.requiredMatched.map((s) => s.targetSkill).join(", ")}).`
    );
  } else {
    points.push(
      `Candidate satisfies ${matchedCount}/${reqCount} required technical competencies. Missing direct evidence for: ${skillsResult.requiredMissing.join(", ")}.`
    );
  }

  // 3. Transferable Skills Rationale
  if (skillsResult.transferableSkills.length > 0) {
    const t = skillsResult.transferableSkills[0];
    points.push(
      `Transferable capability: Candidate proficiency in ${t.candidateSkill} provides substantiated foundational knowledge for ${t.targetSkill}. ${t.rationale}`
    );
  }

  // 4. Experience Relevance (Total vs Relevant)
  const relYears = experienceResult.relevantExperienceYears ?? experienceResult.totalYearsDetected;
  const totYears = experienceResult.totalYearsDetected;
  const reqYears = experienceResult.requiredYears;

  if (experienceResult.status === "exceeds") {
    points.push(
      `Experience requirement exceeded: Profile demonstrates ~${relYears} years of directly relevant domain tenure (~${totYears} total cumulative years) versus ${reqYears}+ years requested.`
    );
  } else if (experienceResult.status === "meets") {
    points.push(
      `Experience requirement met: Extracted timeline accounts for ~${relYears} years of directly relevant domain tenure (~${totYears} total cumulative years).`
    );
  } else {
    points.push(
      `Experience below target: Profile accounts for approximately ${relYears} relevant years (Total: ${totYears} years) against the stated role requirement of ${reqYears}+ years.`
    );
  }

  // 5. Inconsistency / Verification Flags
  if (inconsistencies.length > 0) {
    points.push(
      `Recruiter Verification Note: ${inconsistencies.length} potential area(s) require verification during screening screen (${inconsistencies.map((i) => i.flag).join("; ")}).`
    );
  }

  const explanation = points.join("\n\n");

  return {
    recommendation,
    explanation,
  };
}
