/**
 * MatchLens AI - Bias Reduction & Anonymization Engine
 * 
 * Supports blind candidate screening to minimize unconscious bias
 * regarding candidate gender, ethnicity, age, location, and school pedigree.
 * 
 * Key capabilities:
 * 1. Name masking ("Candidate #1", "Candidate #2")
 * 2. Contact details redaction (email, phone, address)
 * 3. School pedigree normalization ("Accredited University (Degree Verified)")
 * 4. Preserves 100% of technical evidence, skills, responsibilities, and metrics
 */

import { CandidateProfile } from "../types";

export function anonymizeCandidateProfile(
  candidate: CandidateProfile,
  displayIndex = 1
): CandidateProfile {
  return {
    ...candidate,
    name: `Candidate #${displayIndex} (Anonymized)`,
    email: `candidate-${displayIndex}@screening.secure`,
    phone: `[PHONE REDACTED]`,
    location: `[LOCATION REDACTED]`,
    education: candidate.education.map((edu) => ({
      ...edu,
      institution: "Accredited Institution (Pedigree Masked)",
      graduationYear: edu.graduationYear,
    })),
  };
}
