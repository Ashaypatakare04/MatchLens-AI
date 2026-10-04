import { ScoringWeights, ResponsibilityMatchItem } from "../types";

export interface ScoreComputationResult {
  overallScore: number;
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
}

/**
 * Calculates deterministic overall matching score from component scores and configurable weights.
 */
export function calculateOverallScore(
  skillsScore: number,
  experienceScore: number,
  educationScore: number,
  projectsScore: number,
  responsibilities: ResponsibilityMatchItem[],
  weights: ScoringWeights
): ScoreComputationResult {
  // Calculate responsibilities score (0 - 100)
  let respScore = 70;
  if (responsibilities && responsibilities.length > 0) {
    const totalPoints = responsibilities.reduce((sum, item) => {
      if (item.matchLevel === "strong") return sum + 100;
      if (item.matchLevel === "moderate") return sum + 60;
      return sum + 20;
    }, 0);
    respScore = Math.round(totalPoints / responsibilities.length);
  }

  // Normalize weights to sum to 100% if needed
  const totalWeight =
    (weights.skills || 0) +
    (weights.experience || 0) +
    (weights.education || 0) +
    (weights.projects || 0) +
    (weights.responsibilities || 0) || 100;

  const wSkills = (weights.skills / totalWeight) * 100;
  const wExp = (weights.experience / totalWeight) * 100;
  const wEdu = (weights.education / totalWeight) * 100;
  const wProj = (weights.projects / totalWeight) * 100;
  const wResp = (weights.responsibilities / totalWeight) * 100;

  const skillsContrib = (skillsScore * wSkills) / 100;
  const expContrib = (experienceScore * wExp) / 100;
  const eduContrib = (educationScore * wEdu) / 100;
  const projContrib = (projectsScore * wProj) / 100;
  const respContrib = (respScore * wResp) / 100;

  const overall = Math.min(
    100,
    Math.max(0, Math.round(skillsContrib + expContrib + eduContrib + projContrib + respContrib))
  );

  return {
    overallScore: overall,
    scoreBreakdown: {
      skills: Math.round(skillsScore),
      experience: Math.round(experienceScore),
      education: Math.round(educationScore),
      projects: Math.round(projectsScore),
      responsibilities: Math.round(respScore),
    },
    weightedContributions: {
      skills: parseFloat(skillsContrib.toFixed(1)),
      experience: parseFloat(expContrib.toFixed(1)),
      education: parseFloat(eduContrib.toFixed(1)),
      projects: parseFloat(projContrib.toFixed(1)),
      responsibilities: parseFloat(respContrib.toFixed(1)),
    },
  };
}
