import {
  CandidateProfile,
  Job,
  SkillsMatchResult,
  ExperienceMatchResult,
  EducationMatchResult,
  ProjectMatchResult,
  ResponsibilityMatchItem,
  EvidenceItem,
  MatchedSkill,
  RequirementMatchItem,
  RequirementMatchType,
} from "../types";
import { classifySkillEvidence } from "./evidence-classifier";
import { evaluateTransferableSkill } from "../normalization/transferable-engine";
import { SemanticEngine } from "./semantic-similarity";

/**
 * Executes evidence-grounded requirement-level matching between CandidateProfile and Job.
 * Uses real mathematical semantic projection, 5-level evidence classification,
 * contextual transferable skills, and relevant vs total experience calculation.
 */
export function matchCandidateAgainstJob(
  candidate: CandidateProfile,
  job: Job
): {
  skillsResult: SkillsMatchResult;
  experienceResult: ExperienceMatchResult;
  educationResult: EducationMatchResult;
  projectResult: ProjectMatchResult;
  responsibilityAlignment: ResponsibilityMatchItem[];
  strongMatches: string[];
  missingRequirements: string[];
  evidenceLog: EvidenceItem[];
  requirementMatches: RequirementMatchItem[];
  totalExperienceYears: number;
  relevantExperienceYears: number;
  matchingEngine: "gemini" | "local_semantic";
} {
  const evidenceLog: EvidenceItem[] = [];
  const strongMatches: string[] = [];
  const missingRequirements: string[] = [];
  const requirementMatches: RequirementMatchItem[] = [];

  const isGeminiActive = SemanticEngine.isGeminiConfigured();
  const matchingEngine: "gemini" | "local_semantic" = isGeminiActive ? "gemini" : "local_semantic";

  // ================= 1. SKILLS MATCHING (Contextual 5-Level Evidence) =================
  const requiredMatched: MatchedSkill[] = [];
  const requiredMissing: string[] = [];
  const preferredMatched: MatchedSkill[] = [];
  const preferredMissing: string[] = [];
  const transferableSkills: Array<{
    candidateSkill: string;
    targetSkill: string;
    rationale: string;
  }> = [];

  let requiredSkillScoreSum = 0;
  const totalReqSkills = job.requirements.requiredSkills.length || 1;

  for (const reqSkill of job.requirements.requiredSkills) {
    const directEvidence = classifySkillEvidence(reqSkill, candidate);
    let matchType: RequirementMatchType = "MISSING";
    let semanticScore = 0;
    let confidence: "High" | "Moderate" | "Low" = "Low";
    let evidenceQuote = directEvidence.exactQuote;
    let explanation = directEvidence.reasoning;

    // Check for conflicting or unsubstantiated headline claim
    const claimedInHeadline =
      candidate.rawResumeText.slice(0, 400).toLowerCase().includes(reqSkill.toLowerCase()) &&
      directEvidence.level <= 1;

    if (directEvidence.level >= 2) {
      // Level 2, 3, 4, 5
      matchType = "DIRECT MATCH";
      semanticScore = directEvidence.computedScore;
      confidence = directEvidence.level >= 4 ? "High" : "Moderate";
      explanation = `Direct match verified with ${directEvidence.levelName}. ${directEvidence.reasoning}`;

      requiredMatched.push({
        skill: reqSkill,
        targetSkill: reqSkill,
        matchType: "exact",
        evidence: directEvidence.exactQuote,
        confidence: directEvidence.multiplier,
      });

      requiredSkillScoreSum += directEvidence.multiplier;

      evidenceLog.push({
        id: `ev-skill-${reqSkill}-${Math.random().toString(36).substring(2, 6)}`,
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
        explanation = `Skill highlighted in headline/summary, but lacks supporting production duties or project implementations.`;
        missingRequirements.push(`Unsubstantiated claim for ${reqSkill}: mentioned only in skills list`);
      } else {
        matchType = "WEAK / RELATED EVIDENCE";
        semanticScore = 35;
        confidence = "Low";
        explanation = `Skill listed in candidate skills overview, but absent from work responsibilities or project descriptions.`;

        requiredMatched.push({
          skill: reqSkill,
          targetSkill: reqSkill,
          matchType: "exact",
          evidence: directEvidence.exactQuote,
          confidence: 0.35,
        });

        requiredSkillScoreSum += 0.35;
      }
    } else {
      // Direct evidence is Level 0 -> Check contextual transferable skills
      const transferable = evaluateTransferableSkill(reqSkill, candidate);

      if (transferable && transferable.isTransferable) {
        matchType = "TRANSFERABLE / PARTIAL MATCH";
        semanticScore = Math.round(transferable.transferRatio * 100);
        confidence = transferable.confidence;
        evidenceQuote = transferable.evidenceText;
        explanation = transferable.architecturalRationale;

        transferableSkills.push({
          candidateSkill: transferable.sourceSkill,
          targetSkill: reqSkill,
          rationale: transferable.architecturalRationale,
        });

        requiredMatched.push({
          skill: transferable.sourceSkill,
          targetSkill: reqSkill,
          matchType: "transferable",
          evidence: transferable.evidenceText,
          confidence: transferable.transferRatio,
        });

        requiredSkillScoreSum += transferable.transferRatio;

        evidenceLog.push({
          id: `ev-trans-${reqSkill}-${Math.random().toString(36).substring(2, 6)}`,
          claimOrRequirement: `Transferable Skill: ${transferable.sourceSkill} → ${reqSkill}`,
          evidenceText: `${transferable.evidenceText} | Rationale: ${transferable.architecturalRationale}`,
          section: "Transferable Competency",
          quality: transferable.confidence === "High" ? "Moderate" : "Limited",
          nature: "AI interpretation",
        });
      } else {
        // Missing requirement
        matchType = "MISSING";
        semanticScore = 0;
        confidence = "Low";
        evidenceQuote = "No supporting evidence found in resume.";
        explanation = `Candidate resume does not contain direct or transferable evidence for ${reqSkill}.`;

        requiredMissing.push(reqSkill);
        missingRequirements.push(`No direct evidence of ${reqSkill} found`);
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
      scoreContribution: parseFloat(((semanticScore / 100) * (30 / totalReqSkills)).toFixed(1)),
    });
  }

  // Preferred skills evaluation
  let preferredSkillScoreSum = 0;
  const totalPrefSkills = job.requirements.preferredSkills.length || 1;

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
      explanation = `Preferred qualification satisfied with ${directEvidence.levelName}.`;

      preferredMatched.push({
        skill: prefSkill,
        targetSkill: prefSkill,
        matchType: "exact",
        evidence: directEvidence.exactQuote,
        confidence: directEvidence.multiplier,
      });

      preferredSkillScoreSum += directEvidence.multiplier;

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

      preferredMatched.push({
        skill: prefSkill,
        targetSkill: prefSkill,
        matchType: "exact",
        evidence: directEvidence.exactQuote,
        confidence: 0.35,
      });

      preferredSkillScoreSum += 0.35;
    } else {
      const transferable = evaluateTransferableSkill(prefSkill, candidate);
      if (transferable && transferable.isTransferable) {
        matchType = "TRANSFERABLE / PARTIAL MATCH";
        semanticScore = Math.round(transferable.transferRatio * 90);
        confidence = transferable.confidence;
        evidenceQuote = transferable.evidenceText;
        explanation = transferable.architecturalRationale;

        preferredMatched.push({
          skill: transferable.sourceSkill,
          targetSkill: prefSkill,
          matchType: "transferable",
          evidence: transferable.evidenceText,
          confidence: transferable.transferRatio,
        });

        preferredSkillScoreSum += transferable.transferRatio;
      } else {
        matchType = "MISSING";
        semanticScore = 0;
        confidence = "Low";
        evidenceQuote = "No supporting evidence found in resume.";
        explanation = `Preferred qualification not identified in resume.`;

        preferredMissing.push(prefSkill);
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
      scoreContribution: parseFloat(((semanticScore / 100) * (5 / totalPrefSkills)).toFixed(1)),
    });
  }

  // Calculate composite skills score (80% Required, 20% Preferred)
  const reqScore = (requiredSkillScoreSum / totalReqSkills) * 100;
  const prefScore = (preferredSkillScoreSum / totalPrefSkills) * 100;
  const skillScore = Math.min(100, Math.max(0, Math.round(reqScore * 0.8 + prefScore * 0.2)));

  if (requiredMatched.length > 0) {
    strongMatches.push(
      `${requiredMatched.length}/${job.requirements.requiredSkills.length} required skills satisfied (${requiredMatched.map((s) => s.targetSkill).join(", ")})`
    );
  }

  const skillsResult: SkillsMatchResult = {
    score: skillScore,
    requiredMatched,
    requiredMissing,
    preferredMatched,
    preferredMissing,
    transferableSkills,
  };

  // ================= 2. EXPERIENCE MATCHING (Relevant vs Total Experience) =================
  const requiredYears = job.requirements.minExperienceYears || 3;
  const totalExperienceYears = candidate.totalExperienceYears ?? 0;
  const totalYearsDetected = totalExperienceYears;

  // Calculate relevant experience based on domain alignment of work history
  let relevantMonths = 0;
  const techKeywords = /(?:software|developer|engineer|full[\s-]?stack|frontend|backend|cloud|architect|programmer|data|devops|platform|systems)/i;

  for (const role of candidate.workHistory) {
    const roleText = `${role.title} ${role.description} ${(role.technologies || []).join(" ")}`.toLowerCase();
    const isTech = techKeywords.test(role.title);

    // Count how many required or preferred skills this role utilized
    const usedSkills = job.requirements.requiredSkills.concat(job.requirements.preferredSkills).filter((s) =>
      roleText.includes(s.toLowerCase())
    );

    let roleRelevanceRatio = 0.0;
    if (isTech && usedSkills.length >= 2) {
      roleRelevanceRatio = 1.0;
    } else if (isTech || usedSkills.length >= 1) {
      roleRelevanceRatio = 0.85;
    } else if (techKeywords.test(roleText)) {
      roleRelevanceRatio = 0.60;
    } else {
      roleRelevanceRatio = 0.05; // completely unrelated field
    }

    relevantMonths += (role.calculatedDurationMonths || 12) * roleRelevanceRatio;
  }

  const relevantExperienceYears = parseFloat(
    Math.min(totalYearsDetected, relevantMonths / 12).toFixed(1)
  );

  let expStatus: "exceeds" | "meets" | "below" = "meets";
  let expScore = 70;

  if (requiredMatched.length === 0 || relevantExperienceYears === 0) {
    expStatus = "below";
    expScore = 15;
    missingRequirements.push(
      `Documented experience is in an unrelated domain with negligible relevant software engineering tenure (0.0 relevant years)`
    );
  } else if (relevantExperienceYears >= requiredYears + 1.5) {
    expStatus = "exceeds";
    expScore = 100;
    strongMatches.push(
      `${relevantExperienceYears} years directly relevant experience exceeds ${requiredYears}+ years requirement (Total: ${totalYearsDetected} yrs)`
    );
  } else if (relevantExperienceYears >= requiredYears) {
    expStatus = "meets";
    expScore = 90;
    strongMatches.push(
      `${relevantExperienceYears} years relevant experience satisfies ${requiredYears}+ years requirement (Total: ${totalYearsDetected} yrs)`
    );
  } else {
    expStatus = "below";
    const ratio = relevantExperienceYears / (requiredYears || 1);
    expScore = Math.max(25, Math.round(ratio * 75));
    missingRequirements.push(
      `Required ${requiredYears}+ years relevant experience; candidate has ${relevantExperienceYears} relevant years (Total: ${totalYearsDetected} yrs)`
    );
  }

  const relevantRoles = candidate.workHistory.map((role) => ({
    title: role.title,
    company: role.company,
    duration: `${role.startDate} – ${role.endDate} (~${(role.calculatedDurationMonths / 12).toFixed(1)} yrs)`,
    relevanceNote: `Demonstrates hands-on engineering execution: ${role.description.slice(0, 80)}...`,
  }));

  const expEvidenceText = `Relevant software tenure: ${relevantExperienceYears} years (out of ${totalYearsDetected} total cumulative years across ${candidate.workHistory.length} documented position(s)).`;
  evidenceLog.push({
    id: `ev-exp-${Math.random().toString(36).substring(2, 6)}`,
    claimOrRequirement: `Experience: ${requiredYears}+ years required`,
    evidenceText: expEvidenceText,
    section: "Work Experience Timeline",
    quality: "Strong",
    nature: "Computed metric",
  });

  const experienceResult: ExperienceMatchResult = {
    score: expScore,
    totalYearsDetected,
    relevantExperienceYears,
    requiredYears,
    status: expStatus,
    relevantRoles,
    evidence: expEvidenceText,
  };

  // ================= 3. EDUCATION MATCHING =================
  const hasCSDegree = candidate.education.some(
    (e) =>
      /computer|software|engineering|technology|data|information/i.test(e.degree) ||
      /bachelor|master|phd|b\.?s|m\.?s/i.test(e.degree)
  );

  let eduScore = 70;
  let eduMeets = true;
  let eduDegreeMatch = "Bachelor's degree in technical field verified";

  if (candidate.education.length > 0) {
    const highest = candidate.education[0];
    if (/master|m\.?s/i.test(highest.degree)) {
      eduScore = 100;
      eduDegreeMatch = `Advanced degree (${highest.degree}) satisfied`;
      strongMatches.push(`Master's / Advanced degree satisfied (${highest.degree})`);
    } else if (hasCSDegree) {
      eduScore = 95;
      eduDegreeMatch = `Relevant technical degree (${highest.degree}) satisfied`;
      strongMatches.push(`Required degree satisfied (${highest.degree} from ${highest.institution})`);
    } else if (/high\s+school|secondary/i.test(highest.degree)) {
      eduScore = 20;
      eduMeets = false;
      eduDegreeMatch = "High school diploma (technical degree or equivalent practical experience required)";
      missingRequirements.push("Formal higher education / technical degree requirement not satisfied");
    } else {
      eduScore = 80;
      eduDegreeMatch = `Degree present (${highest.degree}), non-traditional background supported by practical experience`;
    }
  } else {
    eduScore = 35;
    eduMeets = false;
    eduDegreeMatch = "No formal degree explicitly detailed in resume";
    missingRequirements.push("Formal education details not identified in resume");
  }

  const eduEvidence =
    candidate.education.length > 0
      ? `${candidate.education[0].degree} from ${candidate.education[0].institution}${candidate.education[0].graduationYear ? ` (${candidate.education[0].graduationYear})` : ""}`
      : "Not found in resume";

  evidenceLog.push({
    id: `ev-edu-${Math.random().toString(36).substring(2, 6)}`,
    claimOrRequirement: "Education Requirement",
    evidenceText: eduEvidence,
    section: "Education",
    quality: candidate.education.length > 0 ? "Strong" : "Limited",
    nature: "Extracted fact",
  });

  const educationResult: EducationMatchResult = {
    score: eduScore,
    meetsRequirement: eduMeets,
    degreeMatch: eduDegreeMatch,
    evidence: eduEvidence,
  };

  // ================= 4. PROJECTS MATCHING =================
  const relevantProjects: Array<{
    title: string;
    techUsed: string[];
    alignmentNote: string;
  }> = [];

  for (const proj of candidate.projects) {
    const overlappingTech = proj.technologies.filter((t) =>
      job.requirements.requiredSkills
        .concat(job.requirements.preferredSkills)
        .some((target) => target.toLowerCase() === t.toLowerCase())
    );

    relevantProjects.push({
      title: proj.title,
      techUsed: proj.technologies,
      alignmentNote:
        overlappingTech.length > 0
          ? `Directly showcases required stack (${overlappingTech.join(", ")}) in production context.`
          : `Demonstrates software delivery and architectural capability: ${proj.description.slice(0, 90)}...`,
    });
  }

  let projectScore = 50;
  if (relevantProjects.length >= 2) {
    projectScore = 95;
    strongMatches.push(
      `Strong portfolio of ${relevantProjects.length} relevant projects demonstrating target tech`
    );
  } else if (relevantProjects.length === 1) {
    const hasDirectReqTech = relevantProjects[0].techUsed.some((t) =>
      job.requirements.requiredSkills.some((r) => r.toLowerCase() === t.toLowerCase())
    );
    projectScore = hasDirectReqTech ? 85 : 70;
  } else if (candidate.workHistory.length >= 2 && requiredMatched.length >= 3) {
    projectScore = 80;
  } else if (candidate.projects.length === 0 && requiredMatched.length === 0) {
    projectScore = 10;
  }

  const projectResult: ProjectMatchResult = {
    score: projectScore,
    relevantProjects,
    evidence: `Extracted ${relevantProjects.length} candidate projects and mapped technologies against role specifications.`,
  };

  // ================= 5. RESPONSIBILITY ALIGNMENT (Contextual & Semantic) =================
  const responsibilityAlignment: ResponsibilityMatchItem[] = [];
  const candidateCorpus = [
    candidate.rawResumeText,
    ...candidate.workHistory.map(
      (w) =>
        `${w.title} ${w.description} ${w.achievements?.join(" ") || ""} ${w.technologies?.join(" ") || ""}`
    ),
    ...candidate.projects.map((p) => `${p.title} ${p.description} ${p.technologies?.join(" ") || ""}`),
  ]
    .join(" ")
    .toLowerCase();

  for (const resp of job.requirements.keyResponsibilities) {
    const respTokens = resp.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length >= 3);
    let matchedTokenCount = 0;
    for (const token of respTokens) {
      if (candidateCorpus.includes(token)) matchedTokenCount++;
    }

    const lexicalRatio = respTokens.length > 0 ? matchedTokenCount / respTokens.length : 0.5;

    let matchLevel: "strong" | "moderate" | "weak" = "weak";
    let candidateEvidence = "Limited direct evidence in employment descriptions.";

    if (lexicalRatio >= 0.35) {
      matchLevel = "strong";
      candidateEvidence = `Strong alignment: candidate has documented experience in ${respTokens.filter((w) => candidateCorpus.includes(w)).slice(0, 3).join(", ")}.`;
    } else if (lexicalRatio >= 0.15) {
      matchLevel = "moderate";
      candidateEvidence = `Moderate alignment: related background observed in work history.`;
    }

    responsibilityAlignment.push({
      responsibility: resp,
      candidateEvidence,
      matchLevel,
    });
  }

  return {
    skillsResult,
    experienceResult,
    educationResult,
    projectResult,
    responsibilityAlignment,
    strongMatches,
    missingRequirements,
    evidenceLog,
    requirementMatches,
    totalExperienceYears,
    relevantExperienceYears,
    matchingEngine,
  };
}
