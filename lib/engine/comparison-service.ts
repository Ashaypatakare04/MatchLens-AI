/**
 * MatchLens AI - Candidate Trade-Off Analysis Engine
 * 
 * Computes explicit, criteria-grounded trade-offs between compared candidates.
 * Avoids vague hand-waving and details exact dimension leads, missing skills,
 * tenure discrepancies, and confidence differences.
 */

import { CandidateWithMatch, Job } from "../types";

export interface CandidatePairTradeoff {
  candidateA: {
    id: string;
    name: string;
    score: number;
  };
  candidateB: {
    id: string;
    name: string;
    score: number;
  };
  scoreDifference: number;
  advantagesA: string[];
  advantagesB: string[];
  tradeoffSummary: string;
}

export function computeCandidateTradeoffs(
  candidates: CandidateWithMatch[],
  job?: Job
): CandidatePairTradeoff[] {
  const tradeoffs: CandidatePairTradeoff[] = [];
  const totalRequired = job?.requirements.requiredSkills.length;

  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const cA = candidates[i];
      const cB = candidates[j];

      const advantagesA: string[] = [];
      const advantagesB: string[] = [];

      // 1. Overall Score & Skills
      const scoreDiff = cA.match.overallScore - cB.match.overallScore;

      const skillsA = cA.match.scoreBreakdown.skills;
      const skillsB = cB.match.scoreBreakdown.skills;
      if (skillsA > skillsB + 5) {
        advantagesA.push(`Higher skills match (${skillsA}% vs ${skillsB}%)`);
      } else if (skillsB > skillsA + 5) {
        advantagesB.push(`Higher skills match (${skillsB}% vs ${skillsA}%)`);
      }

      // 2. Missing Skills
      const missingA = cA.match.skillsAnalysis.requiredMissing;
      const missingB = cB.match.skillsAnalysis.requiredMissing;
      if (missingA.length === 0 && missingB.length > 0) {
        advantagesA.push(
          totalRequired
            ? `Satisfies all ${totalRequired} required skills (Candidate B missing ${missingB.join(", ")})`
            : `Satisfies 100% of required skills (Candidate B missing ${missingB.join(", ")})`
        );
      } else if (missingB.length === 0 && missingA.length > 0) {
        advantagesB.push(
          totalRequired
            ? `Satisfies all ${totalRequired} required skills (Candidate A missing ${missingA.join(", ")})`
            : `Satisfies 100% of required skills (Candidate A missing ${missingA.join(", ")})`
        );
      }

      // 3. Relevant vs Total Tenure
      const tenureA = cA.match.relevantExperienceYears ?? cA.candidate.totalExperienceYears;
      const tenureB = cB.match.relevantExperienceYears ?? cB.candidate.totalExperienceYears;
      if (tenureA > tenureB + 1) {
        advantagesA.push(`+${(tenureA - tenureB).toFixed(1)} more years relevant engineering tenure (${tenureA} vs ${tenureB} yrs)`);
      } else if (tenureB > tenureA + 1) {
        advantagesB.push(`+${(tenureB - tenureA).toFixed(1)} more years relevant engineering tenure (${tenureB} vs ${tenureA} yrs)`);
      }

      // 4. Inconsistency Flags
      const flagsA = cA.match.potentialInconsistencies.length;
      const flagsB = cB.match.potentialInconsistencies.length;
      if (flagsA === 0 && flagsB > 0) {
        advantagesA.push(`Clean profile (0 verification flags vs ${flagsB} flags for Candidate B)`);
      } else if (flagsB === 0 && flagsA > 0) {
        advantagesB.push(`Clean profile (0 verification flags vs ${flagsA} flags for Candidate A)`);
      }

      // 5. Transferable vs Direct
      const transA = cA.match.skillsAnalysis.transferableSkills.length;
      const transB = cB.match.skillsAnalysis.transferableSkills.length;
      if (transA > 0 && transB === 0 && cA.match.skillsAnalysis.requiredMatched.length >= cB.match.skillsAnalysis.requiredMatched.length) {
        advantagesA.push(`Broader transferable adaptability (${transA} equivalent technologies)`);
      }

      // Tradeoff Summary
      let tradeoffSummary = "";
      if (Math.abs(scoreDiff) < 3) {
        tradeoffSummary = `${cA.candidate.name} and ${cB.candidate.name} are closely matched overall (${cA.match.overallScore} vs ${cB.match.overallScore}). Committee review should weigh ${cA.candidate.name}'s ${advantagesA[0] || "profile"} against ${cB.candidate.name}'s ${advantagesB[0] || "strengths"}.`;
      } else if (scoreDiff > 0) {
        tradeoffSummary = `${cA.candidate.name} leads by +${scoreDiff} points, driven by ${advantagesA[0] || "stronger criteria coverage"}. ${cB.candidate.name} remains competitive if the team prioritizes ${advantagesB[0] || "alternative qualities"}.`;
      } else {
        tradeoffSummary = `${cB.candidate.name} leads by +${Math.abs(scoreDiff)} points, driven by ${advantagesB[0] || "stronger criteria coverage"}. ${cA.candidate.name} remains competitive if the team prioritizes ${advantagesA[0] || "alternative qualities"}.`;
      }

      tradeoffs.push({
        candidateA: {
          id: cA.candidate.id,
          name: cA.candidate.name,
          score: cA.match.overallScore,
        },
        candidateB: {
          id: cB.candidate.id,
          name: cB.candidate.name,
          score: cB.match.overallScore,
        },
        scoreDifference: scoreDiff,
        advantagesA,
        advantagesB,
        tradeoffSummary,
      });
    }
  }

  return tradeoffs;
}
