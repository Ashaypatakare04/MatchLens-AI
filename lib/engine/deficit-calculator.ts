/**
 * MatchLens AI - Score Deficit Calculator ("Why Not 100?")
 * 
 * Computes an exact, auditable itemization of:
 * 1. Points gained across evaluation components
 * 2. Points deducted (deficits) explaining why the candidate did not score 100
 * 3. Exact coverage metrics (direct, transferable, missing, unverified)
 * 
 * Never makes vague claims. Every deduction is directly grounded in
 * requirement gaps, transferable credit ceilings, or evidence levels.
 */

import { MatchAnalysis, Job } from "../types";

export interface ScoreDeficitItem {
  category: "required_skill" | "transferable_skill" | "evidence_penalty" | "experience" | "education" | "responsibility" | "preferred_skill";
  pointsLost: number; // e.g. 6.0
  requirement: string;
  reason: string;
  actionableGuidance: string;
}

export interface ScoreGainedItem {
  component: string;
  weight: number;
  score: number;
  pointsContributed: number; // e.g. 28.5
}

export interface ScoreTransparencyReport {
  overallScore: number;
  totalPointsLost: number;
  coverage: {
    directRequiredCount: number;
    transferableRequiredCount: number;
    missingRequiredCount: number;
    totalRequiredCount: number;
    directRatio: number; // e.g. 0.8
  };
  pointsGained: ScoreGainedItem[];
  pointsLost: ScoreDeficitItem[];
  whyNotHigherSummary: string[];
}

export function computeScoreDeficit(
  match: MatchAnalysis,
  job: Job
): ScoreTransparencyReport {
  const overallScore = Math.max(0, Math.min(100, Math.round(match.overallScore)));
  const totalPointsLost = Math.max(0, 100 - overallScore);

  const weights = job.weights;
  const totalReqSkills = job.requirements.requiredSkills.length || 1;
  const maxPtsPerReqSkill = weights.skills / totalReqSkills;

  const pointsLost: ScoreDeficitItem[] = [];

  // 1. Missing Required Skills
  for (const missing of match.skillsAnalysis.requiredMissing) {
    const pts = parseFloat(maxPtsPerReqSkill.toFixed(1));
    pointsLost.push({
      category: "required_skill",
      pointsLost: pts,
      requirement: missing,
      reason: `No direct or transferable evidence for "${missing}" was found in resume`,
      actionableGuidance: `Absence of resume evidence does not prove lack of capability. Verify hands-on proficiency during technical screen.`,
    });
  }

  // 2. Transferable Required Skills (Difference between direct 1.0 credit and transferable capped ratio)
  for (const trans of match.skillsAnalysis.transferableSkills) {
    const matchedSkill = match.skillsAnalysis.requiredMatched.find(
      (m) => m.targetSkill.toLowerCase() === trans.targetSkill.toLowerCase()
    );
    const transferRatio = matchedSkill ? matchedSkill.confidence : 0.70;
    const lostFraction = Math.max(0, 1.0 - transferRatio);
    const pts = parseFloat((lostFraction * maxPtsPerReqSkill).toFixed(1));

    if (pts > 0) {
      pointsLost.push({
        category: "transferable_skill",
        pointsLost: pts,
        requirement: trans.targetSkill,
        reason: `Evidence for "${trans.targetSkill}" is transferable from ${trans.candidateSkill} (${Math.round(transferRatio * 100)}% credit ceiling), rather than direct production experience`,
        actionableGuidance: `Candidate has strong foundational concepts (${trans.candidateSkill}), but may require ramp-up on framework-specific conventions.`,
      });
    }
  }

  // 3. Skills List Only Penalty (Level 1 evidence: 0.35 multiplier vs 1.0)
  if (match.requirementMatches) {
    for (const rm of match.requirementMatches) {
      if (rm.category === "required_skill" && rm.matchType === "WEAK / RELATED EVIDENCE") {
        const lostFraction = 1.0 - 0.35;
        const pts = parseFloat((lostFraction * maxPtsPerReqSkill).toFixed(1));
        pointsLost.push({
          category: "evidence_penalty",
          pointsLost: pts,
          requirement: rm.requirement,
          reason: `"${rm.requirement}" appears only in a skills inventory without supporting project descriptions or employment responsibilities`,
          actionableGuidance: `Request concrete production examples or code artifacts to substantiate depth of experience.`,
        });
      }
    }
  }

  // 4. Experience Deficit
  const expScore = match.scoreBreakdown.experience;
  if (expScore < 100) {
    const maxExpPts = weights.experience;
    const ptsLost = parseFloat((((100 - expScore) / 100) * maxExpPts).toFixed(1));
    const reqYears = job.requirements.minExperienceYears || 0;
    const relYears = match.relevantExperienceYears ?? match.experienceAnalysis?.relevantExperienceYears ?? 0;

    if (ptsLost > 0) {
      pointsLost.push({
        category: "experience",
        pointsLost: ptsLost,
        requirement: `Minimum Experience (${reqYears}+ years)`,
        reason: relYears < reqYears
          ? `Verified domain-relevant engineering experience (~${relYears} yrs) is below requested threshold (~${reqYears} yrs)`
          : `Experience tenure or role seniority does not fully maximize scoring criteria`,
        actionableGuidance: `Assess whether non-traditional projects or open source contributions offset full-time calendar tenure.`,
      });
    }
  }

  // 5. Responsibilities Deficit
  const respScore = match.scoreBreakdown.responsibilities;
  if (respScore < 100) {
    const maxRespPts = weights.responsibilities;
    const ptsLost = parseFloat((((100 - respScore) / 100) * maxRespPts).toFixed(1));
    if (ptsLost > 0) {
      pointsLost.push({
        category: "responsibility",
        pointsLost: ptsLost,
        requirement: "Key Job Responsibilities",
        reason: `Some core job responsibilities (e.g., high-throughput systems, architectural leadership) have limited explicit citations in resume`,
        actionableGuidance: `Focus technical interview on day-to-day architectural ownership.`,
      });
    }
  }

  // 6. Education Deficit
  const eduScore = match.scoreBreakdown.education;
  if (eduScore < 100) {
    const maxEduPts = weights.education;
    const ptsLost = parseFloat((((100 - eduScore) / 100) * maxEduPts).toFixed(1));
    if (ptsLost > 0) {
      pointsLost.push({
        category: "education",
        pointsLost: ptsLost,
        requirement: job.requirements.educationRequirement || "Degree Requirement",
        reason: match.educationAnalysis?.evidence === "Not found in resume"
          ? "Academic degree was not found in submitted resume"
          : "Educational credentials partially fulfill preferred degree requirements",
        actionableGuidance: `Evaluate equivalent hands-on industry experience in lieu of formal university credentials.`,
      });
    }
  }

  // 7. Projects Deficit
  const projScore = match.scoreBreakdown.projects;
  if (projScore < 100) {
    const maxProjPts = weights.projects;
    const ptsLost = parseFloat((((100 - projScore) / 100) * maxProjPts).toFixed(1));
    if (ptsLost > 0) {
      pointsLost.push({
        category: "evidence_penalty",
        pointsLost: ptsLost,
        requirement: "Technical Projects & Implementations",
        reason: "Few dedicated technical projects or open-source repositories explicitly highlighted",
        actionableGuidance: `Review GitHub, portfolio links, or technical publications during interview.`,
      });
    }
  }

  // Sort points lost descending by points lost
  pointsLost.sort((a, b) => b.pointsLost - a.pointsLost);

  // Coverage statistics
  const directRequiredCount = match.skillsAnalysis.requiredMatched.filter(
    (m) => m.matchType === "exact"
  ).length;
  const transferableRequiredCount = match.skillsAnalysis.transferableSkills.length;
  const missingRequiredCount = match.skillsAnalysis.requiredMissing.length;

  const pointsGained: ScoreGainedItem[] = [
    {
      component: "Skills Alignment",
      weight: weights.skills,
      score: match.scoreBreakdown.skills,
      pointsContributed: match.weightedContributions.skills,
    },
    {
      component: "Relevant Experience",
      weight: weights.experience,
      score: match.scoreBreakdown.experience,
      pointsContributed: match.weightedContributions.experience,
    },
    {
      component: "Job Responsibilities",
      weight: weights.responsibilities,
      score: match.scoreBreakdown.responsibilities,
      pointsContributed: match.weightedContributions.responsibilities,
    },
    {
      component: "Technical Projects",
      weight: weights.projects,
      score: match.scoreBreakdown.projects,
      pointsContributed: match.weightedContributions.projects,
    },
    {
      component: "Education Credentials",
      weight: weights.education,
      score: match.scoreBreakdown.education,
      pointsContributed: match.weightedContributions.education,
    },
  ];

  // Build concise recruiter explanation
  const whyNotHigherSummary: string[] = [];
  if (pointsLost.length === 0) {
    whyNotHigherSummary.push("Candidate earned maximum points across all configured evaluation dimensions.");
  } else {
    for (const item of pointsLost.slice(0, 4)) {
      whyNotHigherSummary.push(`-${item.pointsLost} pts: ${item.reason}`);
    }
  }

  return {
    overallScore,
    totalPointsLost,
    coverage: {
      directRequiredCount,
      transferableRequiredCount,
      missingRequiredCount,
      totalRequiredCount: totalReqSkills,
      directRatio: parseFloat((directRequiredCount / totalReqSkills).toFixed(2)),
    },
    pointsGained,
    pointsLost,
    whyNotHigherSummary,
  };
}
