import {
  CandidateProfile,
  Job,
  SkillsMatchResult,
  ExperienceMatchResult,
  PotentialInconsistency,
  AIRecommendation,
} from "../types";

/**
 * Generates an executive summary and explainable rationale for a candidate's match against a job.
 * Grounded in extracted facts and computed timeline metrics.
 */
export function generateExplainableSummary(
  candidate: CandidateProfile,
  job: Job,
  skillsResult: SkillsMatchResult,
  experienceResult: ExperienceMatchResult,
  overallScore: number,
  inconsistencies: PotentialInconsistency[]
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

  // Construct grounded explanation narrative
  const reqCount = job.requirements.requiredSkills.length;
  const matchedCount = skillsResult.requiredMatched.length;

  const points: string[] = [];

  // Match summary
  points.push(
    `Overall matching score is ${overallScore}/100 based on configured evaluation weights.`
  );

  // Skills
  if (matchedCount === reqCount) {
    points.push(
      `Candidate satisfies all ${reqCount} required technical skills (${skillsResult.requiredMatched.map((s) => s.targetSkill).join(", ")}).`
    );
  } else {
    points.push(
      `Candidate demonstrates ${matchedCount}/${reqCount} required skills. Missing direct evidence for: ${skillsResult.requiredMissing.join(", ")}.`
    );
  }

  // Transferable skills
  if (skillsResult.transferableSkills.length > 0) {
    const t = skillsResult.transferableSkills[0];
    points.push(
      `Transferable capability: Candidate's proficiency in ${t.candidateSkill} provides relevant foundational knowledge for ${t.targetSkill}.`
    );
  }

  // Experience
  if (experienceResult.status === "exceeds") {
    points.push(
      `Experience requirement exceeded: Extracted timeline reflects ~${experienceResult.totalYearsDetected} years of cumulative experience versus ${experienceResult.requiredYears}+ years requested.`
    );
  } else if (experienceResult.status === "meets") {
    points.push(
      `Experience requirement met: Extracted timeline accounts for ~${experienceResult.totalYearsDetected} years of hands-on industry tenure.`
    );
  } else {
    points.push(
      `Experience below target: Profile contains approximately ${experienceResult.totalYearsDetected} years against the stated requirement of ${experienceResult.requiredYears}+ years.`
    );
  }

  // Inconsistencies warning
  if (inconsistencies.length > 0) {
    points.push(
      `Notice: ${inconsistencies.length} potential area(s) require recruiter verification during screen (${inconsistencies.map((i) => i.flag).join("; ")}).`
    );
  }

  const explanation = points.join("\n\n");

  return {
    recommendation,
    explanation,
  };
}
