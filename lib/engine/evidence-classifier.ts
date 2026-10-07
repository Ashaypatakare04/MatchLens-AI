/**
 * MatchLens AI - Contextual Evidence Classifier (Levels 0 - 5)
 * 
 * Implements the evidence hierarchy:
 * LEVEL 0: No evidence (Score multiplier: 0.0)
 * LEVEL 1: Skill appears only in a skills list (Score multiplier: 0.35)
 * LEVEL 2: Skill appears in project description (Score multiplier: 0.65)
 * LEVEL 3: Skill appears in work responsibility (Score multiplier: 0.85)
 * LEVEL 4: Skill appears in measurable achievement / production result (Score multiplier: 0.95)
 * LEVEL 5: Skill is supported by multiple independent resume sections (Score multiplier: 1.0)
 * 
 * Calculates grounded contextual score:
 * Contextual Score = skill_relevance × evidence_quality × recency × experience_duration × context_relevance
 */

import { CandidateProfile, WorkExperienceItem, ProjectItem } from "../types";

export type EvidenceLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface ClassifiedEvidence {
  level: EvidenceLevel;
  levelName: string;
  multiplier: number;
  exactQuote: string;
  sourceSection: string;
  reasoning: string;
  isProductionVerified: boolean;
  multipleSectionsCount: number;
  recencyMultiplier: number;
  durationMonths: number;
  computedScore: number; // 0 - 100
}

// Regex to detect measurable achievements (metrics, %, latency, user counts, scale)
const MEASURABLE_METRIC_REGEX = /(?:\d+(?:\.\d+)?%|\$\d+(?:[.,]\d+)?(?:k|m|b)?|\b\d+(?:k|m|b)\b|\b\d+\s*(?:users?|events?|qps|ms|requests?|clients?|customers?|clusters?|services?)\b|(?:reduced|increased|optimized|saved|scaled|spearheaded|accelerated)\b)/i;

/**
 * Escapes regex string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Searches for evidence of a skill across candidate profile sections and classifies evidence quality.
 */
export function classifySkillEvidence(
  targetSkill: string,
  candidate: CandidateProfile
): ClassifiedEvidence {
  const term = targetSkill.trim();
  const lowerTerm = term.toLowerCase();
  const escaped = escapeRegex(term);
  const boundaryRegex = new RegExp(`\\b${escaped}\\b`, "i");

  // Track occurrences across sections
  let foundInSkillsList = false;
  let foundInWorkHistory: WorkExperienceItem[] = [];
  let foundInProjects: ProjectItem[] = [];
  let foundInAchievements: string[] = [];
  let foundInCerts: string[] = [];

  let bestWorkSnippet = "";
  let bestWorkItem: WorkExperienceItem | null = null;
  let bestAchievement = "";
  let bestProjectSnippet = "";

  // 1. Check Skills list
  for (const s of candidate.skills) {
    if (s.toLowerCase() === lowerTerm || boundaryRegex.test(s)) {
      foundInSkillsList = true;
      break;
    }
  }

  // 2. Check Work History
  for (const role of candidate.workHistory) {
    const roleText = `${role.title} ${role.company} ${role.description} ${role.rawText || ""} ${(role.technologies || []).join(" ")}`;
    if (boundaryRegex.test(roleText)) {
      foundInWorkHistory.push(role);
      if (!bestWorkSnippet) {
        bestWorkSnippet =
          extractSnippetAround(role.description, term) ||
          extractSnippetAround(role.rawText || "", term) ||
          role.description.slice(0, 140) ||
          (role.rawText || "").slice(0, 140);
        bestWorkItem = role;
      }

      // Check achievements in role
      if (role.achievements) {
        for (const ach of role.achievements) {
          if (boundaryRegex.test(ach)) {
            foundInAchievements.push(ach);
            if (!bestAchievement) bestAchievement = ach;
          }
        }
      }
    }
  }

  // 3. Check Projects
  for (const proj of candidate.projects) {
    const projText = `${proj.title} ${proj.description} ${(proj.technologies || []).join(" ")}`;
    if (boundaryRegex.test(projText)) {
      foundInProjects.push(proj);
      if (!bestProjectSnippet) {
        bestProjectSnippet = extractSnippetAround(proj.description, term) || proj.description.slice(0, 140);
      }
    }
  }

  // 4. Check Global Achievements
  if (candidate.achievements) {
    for (const ach of candidate.achievements) {
      if (boundaryRegex.test(ach)) {
        foundInAchievements.push(ach);
        if (!bestAchievement) bestAchievement = ach;
      }
    }
  }

  // Count independent sections supporting this skill
  const independentSections: string[] = [];
  if (foundInSkillsList) independentSections.push("Skills List");
  if (foundInWorkHistory.length > 0) independentSections.push("Work Experience");
  if (foundInProjects.length > 0) independentSections.push("Projects");
  if (foundInAchievements.length > 0) independentSections.push("Key Achievements");

  const multipleSectionsCount = independentSections.length;

  // Recency calculation based on best work item
  let recencyMultiplier = 0.85; // default
  let durationMonths = 0;

  if (bestWorkItem) {
    durationMonths = bestWorkItem.calculatedDurationMonths || 12;
    if (bestWorkItem.isCurrent || /present|current/i.test(bestWorkItem.endDate)) {
      recencyMultiplier = 1.0;
    } else {
      const yearMatch = bestWorkItem.endDate.match(/\b(20\d{2})\b/);
      if (yearMatch) {
        const year = parseInt(yearMatch[1], 10);
        const currentYear = new Date().getFullYear();
        const diffYears = currentYear - year;
        if (diffYears <= 1) recencyMultiplier = 0.95;
        else if (diffYears <= 3) recencyMultiplier = 0.85;
        else recencyMultiplier = 0.70;
      }
    }
  } else if (foundInProjects.length > 0) {
    durationMonths = 6;
    recencyMultiplier = 0.90;
  }

  // Check Measurable Metric in achievements or work description
  const hasMeasurableEvidence =
    (bestAchievement && MEASURABLE_METRIC_REGEX.test(bestAchievement)) ||
    (bestWorkSnippet && MEASURABLE_METRIC_REGEX.test(bestWorkSnippet));

  // Determine Evidence Level (0 - 5)
  let level: EvidenceLevel = 0;
  let levelName = "Level 0: No Evidence";
  let multiplier = 0.0;
  let exactQuote = "No supporting evidence found in resume.";
  let sourceSection = "None";
  let reasoning = `No direct mention or contextual application of ${term} was identified in resume.`;
  let isProductionVerified = false;

  if (multipleSectionsCount >= 2 && foundInWorkHistory.length > 0) {
    level = 5;
    levelName = "Level 5: Multiple Independent Sections";
    multiplier = 1.0;
    isProductionVerified = true;
    exactQuote = bestAchievement
      ? `"${bestAchievement}" (also in ${independentSections.join(" + ")})`
      : `"${bestWorkSnippet || term}" (verified across ${independentSections.join(" & ")})`;
    sourceSection = independentSections.join(" & ");
    reasoning = `Strong cross-validated evidence: ${term} is substantiated across ${independentSections.length} independent sections (${independentSections.join(", ")}).`;
  } else if (hasMeasurableEvidence && foundInWorkHistory.length > 0) {
    level = 4;
    levelName = "Level 4: Measurable Production Achievement";
    multiplier = 0.95;
    isProductionVerified = true;
    exactQuote = bestAchievement ? `"${bestAchievement}"` : `"${bestWorkSnippet}"`;
    sourceSection = `Work Experience (${bestWorkItem?.company || "Employment History"})`;
    reasoning = `Demonstrated in measurable production impact with quantified engineering results.`;
  } else if (foundInWorkHistory.length > 0) {
    level = 3;
    levelName = "Level 3: Work Responsibility";
    multiplier = 0.85;
    isProductionVerified = true;
    exactQuote = `"${bestWorkSnippet || bestWorkItem?.description.slice(0, 120)}"`;
    sourceSection = `Work Experience (${bestWorkItem?.company || "Employment History"})`;
    reasoning = `Applied directly in professional duties at ${bestWorkItem?.company || "previous employer"}.`;
  } else if (foundInProjects.length > 0) {
    level = 2;
    levelName = "Level 2: Project Description";
    multiplier = 0.65;
    isProductionVerified = false;
    exactQuote = `"${bestProjectSnippet || foundInProjects[0].title}"`;
    sourceSection = `Projects (${foundInProjects[0].title})`;
    reasoning = `Implemented within technical project environment: "${foundInProjects[0].title}".`;
  } else if (foundInSkillsList) {
    level = 1;
    levelName = "Level 1: Skills List Only";
    multiplier = 0.35;
    isProductionVerified = false;
    exactQuote = `"${term}" explicitly listed in skills inventory without surrounding responsibility context.`;
    sourceSection = "Skills Summary";
    reasoning = `Appears only in skills list; lacks corresponding execution context or production duties.`;
  }

  // Calculate composite score (0 - 100)
  // Contextual formula: baseline 100 * multiplier * recencyMultiplier * durationFactor
  const durationFactor = Math.min(1.1, Math.max(0.8, 0.8 + (durationMonths / 48) * 0.3));
  const rawScore = 100 * multiplier * recencyMultiplier * durationFactor;
  const computedScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  return {
    level,
    levelName,
    multiplier,
    exactQuote,
    sourceSection,
    reasoning,
    isProductionVerified,
    multipleSectionsCount,
    recencyMultiplier,
    durationMonths,
    computedScore,
  };
}

/**
 * Extracts a concise surrounding snippet around a matched keyword
 */
function extractSnippetAround(fullText: string, term: string, charRadius: number = 70): string {
  if (!fullText || !term) return "";
  const idx = fullText.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return "";

  const start = Math.max(0, idx - charRadius);
  const end = Math.min(fullText.length, idx + term.length + charRadius);
  let snippet = fullText.substring(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) snippet = "..." + snippet;
  if (end < fullText.length) snippet = snippet + "...";
  return snippet;
}
