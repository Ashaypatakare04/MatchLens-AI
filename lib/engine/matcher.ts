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
} from "../types";
import { matchSkillAgainstCandidate } from "../normalization/skill-normalizer";

/**
 * Executes transparent requirement-level matching between CandidateProfile and Job.
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
} {
  const evidenceLog: EvidenceItem[] = [];
  const strongMatches: string[] = [];
  const missingRequirements: string[] = [];

  // ================= 1. SKILLS MATCHING =================
  const requiredMatched: MatchedSkill[] = [];
  const requiredMissing: string[] = [];
  const preferredMatched: MatchedSkill[] = [];
  const preferredMissing: string[] = [];
  const transferableSkills: Array<{
    candidateSkill: string;
    targetSkill: string;
    rationale: string;
  }> = [];

  for (const reqSkill of job.requirements.requiredSkills) {
    const res = matchSkillAgainstCandidate(reqSkill, candidate.skills, candidate.rawResumeText);
    if (res.isMatched) {
      requiredMatched.push({
        skill: res.matchedSkillName || reqSkill,
        targetSkill: reqSkill,
        matchType: res.matchType === "none" ? "exact" : res.matchType,
        evidence: res.evidence,
        confidence: res.confidence,
      });

      if (res.matchType === "transferable" && res.transferableRationale) {
        transferableSkills.push({
          candidateSkill: res.matchedSkillName,
          targetSkill: reqSkill,
          rationale: res.transferableRationale,
        });
      }

      evidenceLog.push({
        id: `ev-skill-${reqSkill}-${Math.random().toString(36).substring(2, 5)}`,
        claimOrRequirement: `Required Skill: ${reqSkill}`,
        evidenceText: res.evidence,
        section: "Technical Skills / Experience",
        quality: res.confidence >= 0.9 ? "Strong" : "Moderate",
        nature: "Extracted fact",
      });
    } else {
      requiredMissing.push(reqSkill);
      missingRequirements.push(`No direct evidence of ${reqSkill} found`);
    }
  }

  for (const prefSkill of job.requirements.preferredSkills) {
    const res = matchSkillAgainstCandidate(prefSkill, candidate.skills, candidate.rawResumeText);
    if (res.isMatched) {
      preferredMatched.push({
        skill: res.matchedSkillName || prefSkill,
        targetSkill: prefSkill,
        matchType: res.matchType === "none" ? "exact" : res.matchType,
        evidence: res.evidence,
        confidence: res.confidence,
      });
      evidenceLog.push({
        id: `ev-pref-${prefSkill}-${Math.random().toString(36).substring(2, 5)}`,
        claimOrRequirement: `Preferred Skill: ${prefSkill}`,
        evidenceText: res.evidence,
        section: "Skills / Project Portfolio",
        quality: res.confidence >= 0.9 ? "Strong" : "Moderate",
        nature: "Extracted fact",
      });
    } else {
      preferredMissing.push(prefSkill);
    }
  }

  // Calculate skill score:
  // Required skills are 80% of skills score, Preferred skills are 20%
  const reqTotal = job.requirements.requiredSkills.length || 1;
  const reqWeightSum = requiredMatched.reduce((acc, m) => acc + m.confidence, 0);
  const reqScore = (reqWeightSum / reqTotal) * 100;

  const prefTotal = job.requirements.preferredSkills.length || 1;
  const prefWeightSum = preferredMatched.reduce((acc, m) => acc + m.confidence, 0);
  const prefScore = (prefWeightSum / prefTotal) * 100;

  const skillScore = Math.min(100, Math.round(reqScore * 0.8 + prefScore * 0.2));

  if (requiredMatched.length > 0) {
    strongMatches.push(
      `${requiredMatched.length}/${job.requirements.requiredSkills.length} required skills matched (${requiredMatched.map((s) => s.targetSkill).join(", ")})`
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

  // ================= 2. EXPERIENCE MATCHING =================
  const requiredYears = job.requirements.minExperienceYears || 3;
  const detectedYears = candidate.totalExperienceYears;
  let expStatus: "exceeds" | "meets" | "below" = "meets";
  let expScore = 70;

  if (detectedYears >= requiredYears + 1.5) {
    expStatus = "exceeds";
    expScore = 100;
    strongMatches.push(
      `${detectedYears} years relevant experience exceeds ${requiredYears}+ years requirement`
    );
  } else if (detectedYears >= requiredYears) {
    expStatus = "meets";
    expScore = 90;
    strongMatches.push(`${detectedYears} years experience satisfies ${requiredYears}+ years requirement`);
  } else {
    expStatus = "below";
    const ratio = detectedYears / (requiredYears || 1);
    expScore = Math.max(25, Math.round(ratio * 75));
    missingRequirements.push(
      `Required ${requiredYears}+ years experience; candidate has approximately ${detectedYears} years`
    );
  }

  const relevantRoles = candidate.workHistory.map((role) => ({
    title: role.title,
    company: role.company,
    duration: `${role.startDate} – ${role.endDate} (~${(role.calculatedDurationMonths / 12).toFixed(1)} yrs)`,
    relevanceNote: `Hands-on responsibilities aligned with core engineering workflow: ${role.description.slice(0, 80)}...`,
  }));

  const expEvidenceText = `${detectedYears} cumulative years derived from employment history across ${candidate.workHistory.length} documented position(s).`;
  evidenceLog.push({
    id: `ev-exp-${Math.random().toString(36).substring(2, 5)}`,
    claimOrRequirement: `Experience: ${requiredYears}+ years required`,
    evidenceText: expEvidenceText,
    section: "Work Experience Timeline",
    quality: "Strong",
    nature: "Computed metric",
  });

  const experienceResult: ExperienceMatchResult = {
    score: expScore,
    totalYearsDetected: detectedYears,
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
    } else {
      eduScore = 80;
      eduDegreeMatch = `Degree present (${highest.degree}), non-traditional background supported by practical experience`;
    }
  } else {
    eduScore = 55;
    eduMeets = false;
    eduDegreeMatch = "No formal degree explicitly detailed in resume";
    missingRequirements.push("Formal education details not identified in resume");
  }

  const eduEvidence = candidate.education.length > 0
    ? `${candidate.education[0].degree} from ${candidate.education[0].institution}${candidate.education[0].graduationYear ? ` (${candidate.education[0].graduationYear})` : ""}`
    : "Not found in resume";

  evidenceLog.push({
    id: `ev-edu-${Math.random().toString(36).substring(2, 5)}`,
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
    // Check if project used any required or preferred skills
    const overlappingTech = proj.technologies.filter((t) =>
      job.requirements.requiredSkills.concat(job.requirements.preferredSkills).some(
        (target) => target.toLowerCase() === t.toLowerCase()
      )
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

  let projectScore = 75;
  if (relevantProjects.length >= 2) {
    projectScore = 95;
    strongMatches.push(`Strong portfolio of ${relevantProjects.length} relevant projects demonstrating target tech`);
  } else if (relevantProjects.length === 1) {
    projectScore = 85;
  } else if (candidate.workHistory.length >= 3) {
    projectScore = 80; // Compensated by rich work history
  }

  const projectResult: ProjectMatchResult = {
    score: projectScore,
    relevantProjects,
    evidence: `Extracted ${relevantProjects.length} candidate projects and mapped technologies against role specifications.`,
  };

  // ================= 5. RESPONSIBILITY ALIGNMENT =================
  const responsibilityAlignment: ResponsibilityMatchItem[] = [];
  const candidateCorpus = `${candidate.rawResumeText} ${candidate.workHistory.map((w) => w.description).join(" ")}`.toLowerCase();

  for (const resp of job.requirements.keyResponsibilities) {
    // Keyword extraction from responsibility
    const respWords = resp
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 4 && !["maintain", "ensure", "collaborate", "deliver"].includes(w));

    let matchedWordCount = 0;
    for (const word of respWords) {
      if (candidateCorpus.includes(word)) {
        matchedWordCount++;
      }
    }

    const ratio = respWords.length > 0 ? matchedWordCount / respWords.length : 0.5;
    let matchLevel: "strong" | "moderate" | "weak" = "weak";
    let candidateEvidence = "Limited direct evidence in employment descriptions.";

    if (ratio >= 0.5) {
      matchLevel = "strong";
      candidateEvidence = `Strong alignment: candidate has documented experience in ${respWords.filter((w) => candidateCorpus.includes(w)).slice(0, 3).join(", ")}.`;
    } else if (ratio >= 0.25) {
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
  };
}
