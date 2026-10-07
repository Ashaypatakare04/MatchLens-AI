/**
 * MatchLens AI - Requirement-Level Matching Engine
 * 
 * Performs independent, evidence-grounded matching for EVERY job requirement.
 * Classifies each requirement into:
 * - A. DIRECT MATCH
 * - B. TRANSFERABLE / PARTIAL MATCH
 * - C. WEAK / RELATED EVIDENCE
 * - D. MISSING
 * - E. CONFLICTING / UNCERTAIN
 * 
 * Calculates:
 * - Semantic score (0 - 100)
 * - Evidence score (0 - 100 based on Levels 0 - 5)
 * - Experience score (recency & role depth)
 * - Relevant vs Total Experience years
 */

import {
  CandidateProfile,
  Job,
  RequirementMatchItem,
  RequirementMatchType,
  WorkExperienceItem,
  MatchedSkill,
  EvidenceItem,
  ResponsibilityMatchItem,
} from "../types";
import { SemanticEngine } from "./semantic-similarity";
import { classifySkillEvidence, EvidenceLevel } from "./evidence-classifier";
import { evaluateTransferableSkill } from "../normalization/transferable-engine";
import { normalizeSkill } from "../normalization/skill-normalizer";

export interface FullRequirementAnalysis {
  requirementMatches: RequirementMatchItem[];
  requiredSkillsMatched: MatchedSkill[];
  requiredSkillsMissing: string[];
  preferredSkillsMatched: MatchedSkill[];
  preferredSkillsMissing: string[];
  transferableList: Array<{ candidateSkill: string; targetSkill: string; rationale: string }>;
  responsibilityAlignment: ResponsibilityMatchItem[];
  totalExperienceYears: number;
  relevantExperienceYears: number;
  strongMatches: string[];
  missingRequirements: string[];
  evidenceLog: EvidenceItem[];
  skillsScore: number;
  experienceScore: number;
  responsibilitiesScore: number;
}

/**
 * Evaluates candidate against all individual requirements of a job.
 */
export async function evaluateRequirementsAgainstCandidate(
  candidate: CandidateProfile,
  job: Job
): Promise<FullRequirementAnalysis> {
  const requirementMatches: RequirementMatchItem[] = [];
  const requiredSkillsMatched: MatchedSkill[] = [];
  const requiredSkillsMissing: string[] = [];
  const preferredSkillsMatched: MatchedSkill[] = [];
  const preferredSkillsMissing: string[] = [];
  const transferableList: Array<{ candidateSkill: string; targetSkill: string; rationale: string }> = [];
  const responsibilityAlignment: ResponsibilityMatchItem[] = [];
  const evidenceLog: EvidenceItem[] = [];
  const strongMatches: string[] = [];
  const missingRequirements: string[] = [];

  const rawResumeLower = candidate.rawResumeText.toLowerCase();

  // ================= 1. REQUIRED SKILLS EVALUATION =================
  let requiredSkillsPoints = 0;
  const totalRequired = job.requirements.requiredSkills.length || 1;

  for (const reqSkill of job.requirements.requiredSkills) {
    const directEvidence = classifySkillEvidence(reqSkill, candidate);
    let matchType: RequirementMatchType = "MISSING";
    let semanticScore = 0;
    let confidence: "High" | "Moderate" | "Low" = "Low";
    let evidenceQuote = directEvidence.exactQuote;
    let explanation = directEvidence.reasoning;

    // Check for conflicting/uncertain claim:
    // e.g. candidate claimed "expert in X" or has X in headline, but 0 production evidence
    const claimedInHeadline =
      candidate.rawResumeText.slice(0, 400).toLowerCase().includes(reqSkill.toLowerCase()) &&
      directEvidence.level <= 1;

    if (directEvidence.level >= 2) {
      matchType = "DIRECT MATCH";
      semanticScore = directEvidence.computedScore;
      confidence = directEvidence.level >= 4 ? "High" : "Moderate";
      explanation = `Direct match verified with ${directEvidence.levelName}. ${directEvidence.reasoning}`;

      requiredSkillsMatched.push({
        skill: reqSkill,
        targetSkill: reqSkill,
        matchType: "exact",
        evidence: directEvidence.exactQuote,
        confidence: directEvidence.multiplier,
      });

      requiredSkillsPoints += directEvidence.multiplier;

      evidenceLog.push({
        id: `ev-req-${reqSkill}-${Math.random().toString(36).substring(2, 6)}`,
        claimOrRequirement: `Required Skill: ${reqSkill}`,
        evidenceText: directEvidence.exactQuote,
        section: directEvidence.sourceSection,
        quality: directEvidence.level >= 4 ? "Strong" : "Moderate",
        nature: "Extracted fact",
      });
    } else if (directEvidence.level === 1) {
      if (claimedInHeadline) {
        matchType = "CONFLICTING / UNCERTAIN";
        semanticScore = 30;
        confidence = "Low";
        explanation = `Skill highlighted in summary/headline, but lacks supporting work history, responsibilities, or production projects.`;
        missingRequirements.push(`Unsubstantiated claim for ${reqSkill}: mentioned only in skills list`);
      } else {
        matchType = "WEAK / RELATED EVIDENCE";
        semanticScore = 40;
        confidence = "Low";
        explanation = `Skill appears only in candidate skills list without active employment or project descriptions.`;

        requiredSkillsMatched.push({
          skill: reqSkill,
          targetSkill: reqSkill,
          matchType: "exact",
          evidence: directEvidence.exactQuote,
          confidence: 0.40,
        });

        requiredSkillsPoints += 0.40;
      }
    } else {
      // Direct evidence is Level 0. Check contextual transferable skills!
      const transferable = evaluateTransferableSkill(reqSkill, candidate);

      if (transferable && transferable.isTransferable) {
        matchType = "TRANSFERABLE / PARTIAL MATCH";
        semanticScore = Math.round(transferable.transferRatio * 100);
        confidence = transferable.confidence;
        evidenceQuote = transferable.evidenceText;
        explanation = transferable.architecturalRationale;

        transferableList.push({
          candidateSkill: transferable.sourceSkill,
          targetSkill: reqSkill,
          rationale: transferable.architecturalRationale,
        });

        requiredSkillsMatched.push({
          skill: transferable.sourceSkill,
          targetSkill: reqSkill,
          matchType: "transferable",
          evidence: transferable.evidenceText,
          confidence: transferable.transferRatio,
        });

        requiredSkillsPoints += transferable.transferRatio;

        evidenceLog.push({
          id: `ev-trans-${reqSkill}-${Math.random().toString(36).substring(2, 6)}`,
          claimOrRequirement: `Transferable Skill: ${transferable.sourceSkill} → ${reqSkill}`,
          evidenceText: `${transferable.evidenceText} | Rationale: ${transferable.architecturalRationale}`,
          section: "Transferable Competency",
          quality: transferable.confidence === "High" ? "Moderate" : "Limited",
          nature: "AI interpretation",
        });
      } else {
        // Also run semantic similarity across resume corpus for paraphrased capabilities
        const sim = await SemanticEngine.computeSimilarity(reqSkill, candidate.rawResumeText);
        if (sim.score >= 0.65) {
          matchType = "WEAK / RELATED EVIDENCE";
          semanticScore = Math.round(sim.score * 70);
          confidence = "Low";
          explanation = `Conceptual overlap identified via semantic projection (${Math.round(sim.score * 100)}% similarity), but exact technology was not explicitly listed.`;

          requiredSkillsPoints += 0.30;
        } else {
          matchType = "MISSING";
          semanticScore = 0;
          confidence = "Low";
          evidenceQuote = "No supporting evidence found in resume.";
          explanation = `Candidate resume does not contain direct or transferable evidence for ${reqSkill}.`;

          requiredSkillsMissing.push(reqSkill);
          missingRequirements.push(`No direct or transferable evidence of ${reqSkill} found`);
        }
      }
    }

    requirementMatches.push({
      requirement: reqSkill,
      category: "required_skill",
      matchType,
      semanticScore,
      evidenceScore: directEvidence.computedScore,
      experienceScore: Math.round(directEvidence.recencyMultiplier * 100),
      confidence,
      evidence: evidenceQuote,
      explanation,
      evidenceLevel: directEvidence.level,
      scoreContribution: parseFloat(((semanticScore / 100) * (30 / totalRequired)).toFixed(1)),
    });
  }

  // ================= 2. PREFERRED SKILLS EVALUATION =================
  let preferredSkillsPoints = 0;
  const totalPreferred = job.requirements.preferredSkills.length || 1;

  for (const prefSkill of job.requirements.preferredSkills) {
    const directEvidence = classifySkillEvidence(prefSkill, candidate);
    let matchType: RequirementMatchType = "MISSING";
    let semanticScore = 0;
    let confidence: "High" | "Moderate" | "Low" = "Low";
    let evidenceQuote = directEvidence.exactQuote;
    let explanation = directEvidence.reasoning;

    if (directEvidence.level >= 2) {
      matchType = "DIRECT MATCH";
      semanticScore = directEvidence.computedScore;
      confidence = directEvidence.level >= 4 ? "High" : "Moderate";
      explanation = `Preferred skill verified with ${directEvidence.levelName}.`;

      preferredSkillsMatched.push({
        skill: prefSkill,
        targetSkill: prefSkill,
        matchType: "exact",
        evidence: directEvidence.exactQuote,
        confidence: directEvidence.multiplier,
      });

      preferredSkillsPoints += directEvidence.multiplier;

      evidenceLog.push({
        id: `ev-pref-${prefSkill}-${Math.random().toString(36).substring(2, 6)}`,
        claimOrRequirement: `Preferred Skill: ${prefSkill}`,
        evidenceText: directEvidence.exactQuote,
        section: directEvidence.sourceSection,
        quality: directEvidence.level >= 4 ? "Strong" : "Moderate",
        nature: "Extracted fact",
      });
    } else if (directEvidence.level === 1) {
      matchType = "WEAK / RELATED EVIDENCE";
      semanticScore = 35;
      confidence = "Low";
      explanation = `Listed in skills overview without detailed project/work description.`;

      preferredSkillsMatched.push({
        skill: prefSkill,
        targetSkill: prefSkill,
        matchType: "exact",
        evidence: directEvidence.exactQuote,
        confidence: 0.35,
      });

      preferredSkillsPoints += 0.35;
    } else {
      const transferable = evaluateTransferableSkill(prefSkill, candidate);
      if (transferable && transferable.isTransferable) {
        matchType = "TRANSFERABLE / PARTIAL MATCH";
        semanticScore = Math.round(transferable.transferRatio * 90);
        confidence = transferable.confidence;
        evidenceQuote = transferable.evidenceText;
        explanation = transferable.architecturalRationale;

        preferredSkillsMatched.push({
          skill: transferable.sourceSkill,
          targetSkill: prefSkill,
          matchType: "transferable",
          evidence: transferable.evidenceText,
          confidence: transferable.transferRatio,
        });

        preferredSkillsPoints += transferable.transferRatio;
      } else {
        matchType = "MISSING";
        semanticScore = 0;
        confidence = "Low";
        evidenceQuote = "No supporting evidence found in resume.";
        explanation = `Preferred qualification not identified in resume.`;

        preferredSkillsMissing.push(prefSkill);
      }
    }

    requirementMatches.push({
      requirement: prefSkill,
      category: "preferred_skill",
      matchType,
      semanticScore,
      evidenceScore: directEvidence.computedScore,
      experienceScore: Math.round(directEvidence.recencyMultiplier * 100),
      confidence,
      evidence: evidenceQuote,
      explanation,
      evidenceLevel: directEvidence.level,
      scoreContribution: parseFloat(((semanticScore / 100) * (5 / totalPreferred)).toFixed(1)),
    });
  }

  // Calculate overall skills score (Required 80%, Preferred 20%)
  const reqPct = (requiredSkillsPoints / totalRequired) * 100;
  const prefPct = (preferredSkillsPoints / totalPreferred) * 100;
  const skillsScore = Math.min(100, Math.max(0, Math.round(reqPct * 0.80 + prefPct * 0.20)));

  if (requiredSkillsMatched.length > 0) {
    strongMatches.push(
      `${requiredSkillsMatched.length}/${job.requirements.requiredSkills.length} required skills satisfied (${requiredSkillsMatched.map((s) => s.targetSkill).join(", ")})`
    );
  }

  // ================= 3. RELEVANT EXPERIENCE CALCULATION =================
  // Evaluates every work role for relevance to job domain rather than blindly counting years
  const jobRequirementsCorpus = [
    job.title,
    ...job.requirements.requiredSkills,
    ...job.requirements.keyResponsibilities,
  ].join(" ").toLowerCase();

  let relevantMonths = 0;
  const totalMonths = candidate.workHistory.reduce((acc, w) => acc + (w.calculatedDurationMonths || 12), 0);

  for (const role of candidate.workHistory) {
    const roleCorpus = `${role.title} ${role.description} ${(role.technologies || []).join(" ")} ${(role.achievements || []).join(" ")}`;
    const sim = await SemanticEngine.computeSimilarity(jobRequirementsCorpus, roleCorpus);

    // If role has engineering relevance (sim >= 0.35 or title contains engineering/developer keywords)
    const isTechRole = /engineer|developer|architect|programmer|full[\s-]?stack|frontend|backend|cloud|software|devops|data|platform/i.test(role.title);

    let roleRelevanceRatio = 0.0;
    if (isTechRole && sim.score >= 0.40) {
      roleRelevanceRatio = Math.min(1.0, 0.6 + sim.score * 0.4);
    } else if (isTechRole) {
      roleRelevanceRatio = 0.50;
    } else if (sim.score >= 0.45) {
      roleRelevanceRatio = 0.35;
    } else {
      roleRelevanceRatio = 0.05; // completely unrelated (e.g. retail, cashier, unrelated store manager)
    }

    relevantMonths += (role.calculatedDurationMonths || 12) * roleRelevanceRatio;
  }

  const totalExperienceYears = candidate.totalExperienceYears || parseFloat((totalMonths / 12).toFixed(1));
  const relevantExperienceYears = parseFloat(Math.min(totalExperienceYears, relevantMonths / 12).toFixed(1));

  const requiredExpYears = job.requirements.minExperienceYears || 3;
  let experienceScore = 50;

  if (relevantExperienceYears === 0 || requiredSkillsMatched.length === 0) {
    experienceScore = 15;
    missingRequirements.push("Experience is in an unrelated domain with negligible relevant software engineering tenure");
  } else if (relevantExperienceYears >= requiredExpYears + 1.5) {
    experienceScore = 100;
    strongMatches.push(
      `${relevantExperienceYears} years directly relevant experience exceeds ${requiredExpYears}+ years requirement (Total: ${totalExperienceYears} yrs)`
    );
  } else if (relevantExperienceYears >= requiredExpYears) {
    experienceScore = 90;
    strongMatches.push(
      `${relevantExperienceYears} years relevant experience meets ${requiredExpYears}+ years requirement (Total: ${totalExperienceYears} yrs)`
    );
  } else {
    const ratio = relevantExperienceYears / requiredExpYears;
    experienceScore = Math.max(25, Math.round(ratio * 75));
    missingRequirements.push(
      `Required ${requiredExpYears}+ years relevant experience; candidate has ${relevantExperienceYears} relevant years (Total: ${totalExperienceYears} yrs)`
    );
  }

  // ================= 4. RESPONSIBILITY ALIGNMENT (SEMANTIC) =================
  let respScoreTotal = 0;
  const candidateCorpus = [
    candidate.rawResumeText,
    ...candidate.workHistory.map((w) => `${w.title} ${w.description} ${w.achievements?.join(" ") || ""}`),
    ...candidate.projects.map((p) => `${p.title} ${p.description}`),
  ].join(" \n ");

  for (const resp of job.requirements.keyResponsibilities) {
    const sim = await SemanticEngine.computeSimilarity(resp, candidateCorpus);

    let matchLevel: "strong" | "moderate" | "weak" = "weak";
    let candidateEvidence = "Limited direct evidence in employment descriptions.";

    if (sim.score >= 0.60) {
      matchLevel = "strong";
      respScoreTotal += 100;
      candidateEvidence = `Strong semantic alignment (${Math.round(sim.score * 100)}% contextual match) with documented role deliverables and architecture.`;
    } else if (sim.score >= 0.35) {
      matchLevel = "moderate";
      respScoreTotal += 65;
      candidateEvidence = `Moderate contextual alignment (${Math.round(sim.score * 100)}% match): related concepts demonstrated in background.`;
    } else {
      matchLevel = "weak";
      respScoreTotal += 20;
      candidateEvidence = `Limited direct alignment observed in candidate project and work descriptions.`;
    }

    responsibilityAlignment.push({
      responsibility: resp,
      candidateEvidence,
      matchLevel,
    });
  }

  const responsibilitiesScore =
    job.requirements.keyResponsibilities.length > 0
      ? Math.round(respScoreTotal / job.requirements.keyResponsibilities.length)
      : 70;

  return {
    requirementMatches,
    requiredSkillsMatched,
    requiredSkillsMissing,
    preferredSkillsMatched,
    preferredSkillsMissing,
    transferableList,
    responsibilityAlignment,
    totalExperienceYears,
    relevantExperienceYears,
    strongMatches,
    missingRequirements,
    evidenceLog,
    skillsScore,
    experienceScore,
    responsibilitiesScore,
  };
}
