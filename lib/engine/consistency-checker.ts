import { CandidateProfile, PotentialInconsistency } from "../types";
import { detectEmploymentOverlaps } from "../normalization/date-timeline";

/**
 * ALG-AI-01 Bonus Engine: Detects suspicious, unsupported, or contradictory claims.
 * Uses objective, respectful language focused on verification rather than accusatory labels.
 */
export function checkProfileConsistency(
  candidate: CandidateProfile
): PotentialInconsistency[] {
  const inconsistencies: PotentialInconsistency[] = [];
  const rawLower = candidate.rawResumeText.toLowerCase();

  // 1. Contradictory Employment Dates (Overlaps)
  const overlaps = detectEmploymentOverlaps(candidate.workHistory);
  for (const overlap of overlaps) {
    inconsistencies.push({
      id: `incon-date-${Math.random().toString(36).substring(2, 7)}`,
      type: "contradictory_dates",
      severity: overlap.overlapMonths > 6 ? "high" : "medium",
      flag: "Possible overlapping employment dates",
      claim: `Concurrent tenure at "${overlap.roleA.company}" (${overlap.roleA.startDate} - ${overlap.roleA.endDate}) and "${overlap.roleB.company}" (${overlap.roleB.startDate} - ${overlap.roleB.endDate})`,
      evidence: `Extracted timeline indicates an overlap of approximately ${overlap.overlapMonths} months between two seemingly full-time roles without explicit designation of concurrent contract work.`,
      recommendation:
        "Clarify with candidate whether these roles were concurrent consulting engagements or a date typographic error.",
    });
  }

  // 2. Experience Claim vs Detected Timeline Mismatch
  if (candidate.statedExperienceYears && candidate.totalExperienceYears > 0) {
    const diff = candidate.statedExperienceYears - candidate.totalExperienceYears;
    // If stated is noticeably higher than computed timeline (diff >= 2.0 years)
    if (diff >= 2.0) {
      inconsistencies.push({
        id: `incon-exp-${Math.random().toString(36).substring(2, 7)}`,
        type: "experience_mismatch",
        severity: diff > 4 ? "high" : "medium",
        flag: "Experience claim requires verification",
        claim: `Summary statement claims "${candidate.statedExperienceYears}+ years" of professional experience.`,
        evidence: `Extracted employment timeline accounts for approximately ${candidate.totalExperienceYears} years of cumulative work history (a discrepancy of ${diff.toFixed(1)} years).`,
        recommendation:
          "Verify during recruiter screen whether earlier positions, internships, or freelance work were omitted from the resume.",
      });
    }
  }

  // 3. Unsupported Skill / Seniority Claims
  // Look for bold claims like "expert in X", "master of X", "architect in X", "specialist in X"
  const expertiseClaims = [
    { regex: /(?:expert|specialist|master|authority)\s+(?:in|with|of)\s+([a-zA-Z0-9.+]+)/i, label: "Expertise" },
    { regex: /deep\s+expertise\s+in\s+([a-zA-Z0-9.+]+)/i, label: "Deep Expertise" },
    { regex: /(?:principal|lead|staff)\s+([a-zA-Z0-9.+]+)\s+(?:architect|engineer|developer)/i, label: "Principal/Architect" },
  ];

  for (const { regex } of expertiseClaims) {
    const match = candidate.rawResumeText.match(regex);
    if (match) {
      const fullClaim = match[0];
      const claimedDomain = match[1]?.trim().toLowerCase();

      if (claimedDomain && claimedDomain.length > 2) {
        // Check if there is actual project, work experience or cert mentioning this domain
        const foundInProjects = candidate.projects.some((p) =>
          p.description.toLowerCase().includes(claimedDomain) ||
          p.technologies.some((t) => t.toLowerCase().includes(claimedDomain))
        );
        const foundInRoles = candidate.workHistory.some((w) =>
          w.description.toLowerCase().includes(claimedDomain) ||
          w.title.toLowerCase().includes(claimedDomain) ||
          (w.achievements && w.achievements.some((a) => a.toLowerCase().includes(claimedDomain)))
        );
        const foundInCerts = candidate.certifications.some((c) =>
          c.name.toLowerCase().includes(claimedDomain)
        );

        // If claimed expert/architect but nowhere substantiated in role duties or projects
        if (!foundInProjects && !foundInRoles && !foundInCerts) {
          inconsistencies.push({
            id: `incon-claim-${Math.random().toString(36).substring(2, 7)}`,
            type: "unsupported_claim",
            severity: "medium",
            flag: "Unsupported skill claim",
            claim: `Candidate states: "${fullClaim}"`,
            evidence: `The resume mentions "${claimedDomain}" in headline/summary, but lacks corresponding detailed project implementation, company achievements, or accredited certifications demonstrating applied production mastery.`,
            recommendation:
              `Ask candidate in technical interview for specific production examples, architecture decisions, and hands-on depth with ${match[1]}.`,
          });
        }
      }
    }
  }

  // 4. Chronological sequence anomalies (e.g., job ended before graduation or negative dates)
  for (const edu of candidate.education) {
    if (edu.graduationYear && candidate.workHistory.length > 0) {
      const earliestRole = candidate.workHistory[candidate.workHistory.length - 1];
      const earliestStartYear = parseInt(earliestRole.startDate.match(/\d{4}/)?.[0] || "9999", 10);
      if (earliestStartYear < edu.graduationYear - 5) {
        // Substantial full-time roles prior to college
        // Could be second career, note neutrally
      }
    }
  }

  return inconsistencies;
}
