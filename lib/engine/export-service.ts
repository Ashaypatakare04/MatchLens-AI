/**
 * MatchLens AI - Hiring Committee Evidence Pack & Export Service
 * 
 * Generates audit-ready, structured Markdown reports for:
 * 1. Single Candidate Evidence Dossier (Hiring Committee Evidence Pack)
 * 2. Multi-Candidate Side-by-Side Comparison Brief
 * 
 * Includes:
 * - Deterministic score breakdown & score deficits ("Why not higher?")
 * - Requirement-by-requirement evidence citations & quality levels
 * - Transferable skills rationale & ceilings
 * - Verified relevant tenure vs total tenure
 * - Potential inconsistency flags and recruiter interview advice
 * - Recruiter decision history & audit trail
 */

import { CandidateProfile, MatchAnalysis, Job, CandidateWithMatch } from "../types";
import { computeScoreDeficit } from "./deficit-calculator";

export function generateCandidateEvidencePackMarkdown(
  candidate: CandidateProfile,
  match: MatchAnalysis,
  job: Job
): string {
  const deficitReport = computeScoreDeficit(match, job);
  const now = new Date().toISOString().split("T")[0];

  let md = `# HIRING COMMITTEE EVIDENCE PACK
**Confidential Candidate Assessment Dossier**

---

## 1. Candidate Overview & Job Alignment
- **Candidate Name**: ${candidate.name}
- **Role Applied**: ${job.title} (${job.company})
- **Location**: ${candidate.location}
- **Assessment Date**: ${now}
- **Configured Matching Score**: **${Math.round(match.overallScore)} / 100**
- **AI Recommendation**: **${match.aiRecommendation}**
- **Recruiter Decision**: **${(match.recruiterDecision || "unreviewed").toUpperCase()}**
- **Pipeline Stage**: **${(match.pipelineStage || "screening").toUpperCase()}**
- **Engine Mode**: ${match.matchingEngine === "gemini" ? "Google Gemini Embeddings" : "Deterministic Multi-Domain Semantic Engine (Local)"}

> **Decision Support Notice**: This match score is an alignment metric against defined requisition requirements, not an automated prediction of hiring success. Absence of resume evidence does not demonstrate absence of candidate capability.

---

## 2. Deterministic Score Breakdown & Transparency
### Points Gained (${Math.round(match.overallScore)} pts)
| Component | Configured Weight | Raw Score | Points Contributed |
|:---|:---:|:---:|:---:|
| Skills Match | ${job.weights.skills}% | ${match.scoreBreakdown.skills}% | +${match.weightedContributions.skills.toFixed(1)} pts |
| Experience Tenure | ${job.weights.experience}% | ${match.scoreBreakdown.experience}% | +${match.weightedContributions.experience.toFixed(1)} pts |
| Responsibilities Alignment | ${job.weights.responsibilities}% | ${match.scoreBreakdown.responsibilities}% | +${match.weightedContributions.responsibilities.toFixed(1)} pts |
| Technical Projects | ${job.weights.projects}% | ${match.scoreBreakdown.projects}% | +${match.weightedContributions.projects.toFixed(1)} pts |
| Education Credentials | ${job.weights.education}% | ${match.scoreBreakdown.education}% | +${match.weightedContributions.education.toFixed(1)} pts |
| **Total Alignment** | **100%** | — | **${match.overallScore.toFixed(1)} / 100** |

### Score Deficit Analysis: Why Didn't This Candidate Score 100?
*Total Deficit: -${deficitReport.totalPointsLost} pts*

`;

  if (deficitReport.pointsLost.length === 0) {
    md += `*Candidate achieved 100% alignment across all specified criteria with zero point deductions.*\n\n`;
  } else {
    md += `| Category | Deduction | Requirement | Root Cause | Recruiter Actionable Guidance |\n|:---|:---:|:---|:---|:---|\n`;
    for (const item of deficitReport.pointsLost) {
      md += `| ${item.category} | -${item.pointsLost} pts | \`${item.requirement}\` | ${item.reason} | ${item.actionableGuidance} |\n`;
    }
    md += `\n`;
  }

  md += `---

## 3. Requirement-Level Evidence Matrix
Evaluated independently against defined requisition requirements:

`;

  if (match.requirementMatches && match.requirementMatches.length > 0) {
    md += `| Category | Requirement | Match Status | Quality | Grounded Citation / Evidence Snippet |\n|:---:|:---|:---:|:---:|:---|\n`;
    for (const req of match.requirementMatches) {
      const snippet = req.evidence
        ? req.evidence.replace(/\n/g, " ").slice(0, 120) + (req.evidence.length > 120 ? "..." : "")
        : "No direct evidence detected in submitted resume.";
      md += `| ${req.category} | **${req.requirement}** | ${req.matchType} | Level ${req.evidenceLevel ?? 0} | ${snippet} |\n`;
    }
    md += `\n`;
  } else {
    // Fallback to skills analysis
    md += `### Required Skills Coverage (${match.skillsAnalysis.requiredMatched.length}/${job.requirements.requiredSkills.length})\n`;
    for (const s of match.skillsAnalysis.requiredMatched) {
      md += `- **${s.targetSkill}**: ✓ Matched via \`${s.skill}\` (${s.matchType}) — *"${s.evidence}"*\n`;
    }
    if (match.skillsAnalysis.requiredMissing.length > 0) {
      md += `\n### Missing Required Skills\n`;
      for (const m of match.skillsAnalysis.requiredMissing) {
        md += `- **${m}**: ⚠ Not found in submitted resume\n`;
      }
    }
    md += `\n`;
  }

  md += `---

## 4. Transferable Skills & Architectural Equivalences
`;

  if (match.skillsAnalysis.transferableSkills.length === 0) {
    md += `*No transferable skill substitutions were credited. All satisfied skills are direct matches.*\n\n`;
  } else {
    md += `| Requisition Target | Candidate Demonstrated Skill | Category | Architectural Rationale |\n|:---|:---|:---:|:---|\n`;
    for (const t of match.skillsAnalysis.transferableSkills) {
      md += `| **${t.targetSkill}** | \`${t.candidateSkill}\` | Transferable | ${t.rationale} |\n`;
    }
    md += `\n*Note: Transferable skill credit is strictly capped (never equals direct experience) and requires demonstrated conceptual engineering overlap.*\n\n`;
  }

  md += `---

## 5. Experience & Tenure Verification
- **Total Cumulative Tenure**: ${candidate.totalExperienceYears} years (${candidate.workHistory.length} documented positions)
- **Domain-Relevant Engineering Tenure**: **${match.relevantExperienceYears ?? match.experienceAnalysis.relevantExperienceYears ?? candidate.totalExperienceYears} years**
- **Requisition Threshold**: ${job.requirements.minExperienceYears}+ years
- **Tenure Alignment Status**: **${match.experienceAnalysis.status.toUpperCase()}**

### Verified Career History
`;

  for (const role of candidate.workHistory) {
    const durationStr = role.startDate && role.endDate ? `${role.startDate} – ${role.endDate}` : `${role.calculatedDurationMonths} mos`;
    md += `#### ${role.title} — ${role.company} (${durationStr})\n`;
    if (role.technologies && role.technologies.length > 0) {
      md += `*Technologies*: ${role.technologies.join(", ")}\n\n`;
    }
    if (role.description) {
      md += `${role.description}\n\n`;
    }
    if (role.achievements && role.achievements.length > 0) {
      for (const ach of role.achievements.slice(0, 3)) {
        md += `- ${ach}\n`;
      }
      md += `\n`;
    }
  }

  md += `---

## 6. Integrity Verification & Inconsistency Flags
`;

  if (match.potentialInconsistencies.length === 0) {
    md += `✓ **Zero Anomaly Flags Detected**: Employment dates are chronologically consistent and technical claims are substantiated across resume sections.\n\n`;
  } else {
    md += `| Severity | Flag Description | Detected Claim | Verification Evidence | Recruiter Guidance |\n|:---:|:---|:---|:---|:---|\n`;
    for (const inc of match.potentialInconsistencies) {
      md += `| **${inc.severity.toUpperCase()}** | ${inc.flag} | *"${inc.claim}"* | ${inc.evidence} | **${inc.recommendation}** |\n`;
    }
    md += `\n`;
  }

  md += `---

## 7. Recruiter Decisions & Governance
- **Current Status**: **${(match.recruiterDecision || "unreviewed").toUpperCase()}**
- **Pipeline Stage**: **${(match.pipelineStage || "screening").toUpperCase()}**
- **Recruiter Evaluation Notes**: ${match.recruiterNotes ? `"${match.recruiterNotes}"` : "*No notes recorded.*"}
`;

  if (match.recruiterFeedback) {
    md += `\n### Recruiter Calibration Feedback
- **Override Type**: \`${match.recruiterFeedback.overrideType}\`
- **Reason Category**: \`${match.recruiterFeedback.reason}\`
- **Feedback Comments**: ${match.recruiterFeedback.comment || "N/A"}
- **Calibrated At**: ${match.recruiterFeedback.timestamp}
`;
  }

  md += `\n---
*Report generated by MatchLens AI Decision-Support Workspace on ${new Date().toISOString()}.*
`;

  return md;
}

export function generateComparisonBriefMarkdown(
  candidates: CandidateWithMatch[],
  job: Job
): string {
  const now = new Date().toISOString().split("T")[0];

  let md = `# CANDIDATE COMPARISON BRIEF
**Hiring Committee Executive Decision Summary**

---

## Position Requisition
- **Job Title**: ${job.title} (${job.company})
- **Location**: ${job.location} • ${job.workMode}
- **Required Skills**: ${job.requirements.requiredSkills.join(", ")}
- **Minimum Experience**: ${job.requirements.minExperienceYears}+ years
- **Brief Generation Date**: ${now}

---

## 1. Candidate Leaderboard & Metrics Summary
| Rank | Candidate | Overall Score | Recruiter Decision | Required Skills | Relevant Tenure | Flags |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|
`;

  candidates.forEach(({ candidate, match }, idx) => {
    const matchedCount = match.skillsAnalysis.requiredMatched.length;
    const totalCount = job.requirements.requiredSkills.length;
    const relevantTenure = match.relevantExperienceYears ?? match.experienceAnalysis.relevantExperienceYears ?? candidate.totalExperienceYears;
    const flagsCount = match.potentialInconsistencies.length;

    md += `| #${idx + 1} | **${candidate.name}** | **${match.overallScore}/100** | ${(match.recruiterDecision || "unreviewed").toUpperCase()} | ${matchedCount}/${totalCount} | ${relevantTenure} yrs | ${flagsCount > 0 ? `⚠ ${flagsCount}` : "✓ 0"} |\n`;
  });

  md += `\n---

## 2. Key Head-to-Head Trade-Offs

`;

  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const cA = candidates[i];
      const cB = candidates[j];

      md += `### ${cA.candidate.name} vs. ${cB.candidate.name}\n`;

      const scoreDiff = cA.match.overallScore - cB.match.overallScore;
      if (Math.abs(scoreDiff) < 3) {
        md += `- **Score Alignment**: Statistically comparable overall alignment (${cA.match.overallScore} vs ${cB.match.overallScore}). Differing profiles require qualitative committee review.\n`;
      } else if (scoreDiff > 0) {
        md += `- **Score Lead**: ${cA.candidate.name} leads by **+${scoreDiff} pts** (${cA.match.overallScore} vs ${cB.match.overallScore}).\n`;
      } else {
        md += `- **Score Lead**: ${cB.candidate.name} leads by **+${Math.abs(scoreDiff)} pts** (${cB.match.overallScore} vs ${cA.match.overallScore}).\n`;
      }

      // Skills differences
      const cAMissing = cA.match.skillsAnalysis.requiredMissing;
      const cBMissing = cB.match.skillsAnalysis.requiredMissing;
      if (cAMissing.length === 0 && cBMissing.length > 0) {
        md += `- **Technical Coverage**: ${cA.candidate.name} satisfies all required skills, while ${cB.candidate.name} is missing direct proof of \`${cBMissing.join(", ")}\`.\n`;
      } else if (cBMissing.length === 0 && cAMissing.length > 0) {
        md += `- **Technical Coverage**: ${cB.candidate.name} satisfies all required skills, while ${cA.candidate.name} is missing direct proof of \`${cAMissing.join(", ")}\`.\n`;
      }

      // Tenure differences
      const tenureA = cA.match.relevantExperienceYears ?? cA.candidate.totalExperienceYears;
      const tenureB = cB.match.relevantExperienceYears ?? cB.candidate.totalExperienceYears;
      if (tenureA > tenureB + 1) {
        md += `- **Relevant Tenure**: ${cA.candidate.name} offers +${(tenureA - tenureB).toFixed(1)} more years of verified relevant engineering experience (${tenureA} yrs vs ${tenureB} yrs).\n`;
      } else if (tenureB > tenureA + 1) {
        md += `- **Relevant Tenure**: ${cB.candidate.name} offers +${(tenureB - tenureA).toFixed(1)} more years of verified relevant engineering experience (${tenureB} yrs vs ${tenureA} yrs).\n`;
      }

      // Flags
      if (cA.match.potentialInconsistencies.length === 0 && cB.match.potentialInconsistencies.length > 0) {
        md += `- **Verification Confidence**: ${cA.candidate.name} has zero anomaly flags, whereas ${cB.match.potentialInconsistencies.length} items require human verification for ${cB.candidate.name}.\n`;
      } else if (cB.match.potentialInconsistencies.length === 0 && cA.match.potentialInconsistencies.length > 0) {
        md += `- **Verification Confidence**: ${cB.candidate.name} has zero anomaly flags, whereas ${cA.match.potentialInconsistencies.length} items require human verification for ${cA.candidate.name}.\n`;
      }

      md += `\n`;
    }
  }

  md += `---
*Generated by MatchLens AI Recruiter Workspace.*
`;

  return md;
}
