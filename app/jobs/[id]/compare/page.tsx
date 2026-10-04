"use client";

import { useEffect, useState, use } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  GraduationCap,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { ScoreBadge } from "@/components/ScoreBadge";
import { CandidateProfile, MatchAnalysis, Job, CandidateWithMatch } from "@/lib/types";

export default function CandidateComparisonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.id || "job-cloudscale-sr-fullstack";
  const searchParams = useSearchParams();
  const idsQuery = searchParams.get("ids") || "";

  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<CandidateWithMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComparisonData = async () => {
      setLoading(true);
      try {
        const jobRes = await fetch(`/api/jobs/${jobId}`);
        if (jobRes.ok) {
          const jobJson = await jobRes.json();
          setJob(jobJson.job);
        }

        const candRes = await fetch(`/api/jobs/${jobId}/candidates`);
        if (candRes.ok) {
          const candJson = await candRes.json();
          const all: CandidateWithMatch[] = candJson.candidates || [];

          const targetIds = idsQuery
            ? idsQuery.split(",").filter(Boolean)
            : all.slice(0, 3).map((c) => c.candidate.id); // default to top 3 if none specified

          const selected = all.filter((item) => targetIds.includes(item.candidate.id));
          setCandidates(selected);
        }
      } catch (err) {
        console.error("Failed to load candidate comparison:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchComparisonData();
  }, [jobId, idsQuery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8 text-slate-500 text-sm">
          Generating side-by-side criteria comparison...
        </div>
      </div>
    );
  }

  if (candidates.length < 2) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100">
        <Navbar />
        <div className="flex-1 max-w-4xl mx-auto p-8 text-center space-y-4">
          <Scale className="w-10 h-10 text-slate-400 mx-auto" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Please select at least 2 candidates to compare
          </h2>
          <p className="text-xs text-slate-500">
            Use the checkboxes on the candidate dashboard to select 2 to 4 candidates.
          </p>
          <Link
            href={`/jobs/${jobId}/candidates`}
            className="inline-block text-xs font-semibold text-indigo-600 hover:underline"
          >
            ← Go to Candidate Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Generate objective ranking explanation comparing candidates
  const topCandidate = candidates[0];
  const secondCandidate = candidates[1];
  const differenceSummary = `According to the configured job weights (${job?.weights.skills}% Skills, ${job?.weights.experience}% Experience, ${job?.weights.responsibilities}% Responsibilities): ${topCandidate.candidate.name} (${topCandidate.match.overallScore}/100) ranks higher primarily because they satisfy ${topCandidate.match.skillsAnalysis.requiredMatched.length}/${job?.requirements.requiredSkills.length} required technical skills and demonstrate ${topCandidate.candidate.totalExperienceYears} years of verified timeline experience, compared to ${secondCandidate.candidate.name} (${secondCandidate.match.overallScore}/100) who has ${secondCandidate.match.skillsAnalysis.requiredMissing.length > 0 ? `missing required skills (${secondCandidate.match.skillsAnalysis.requiredMissing.join(", ")})` : `${secondCandidate.candidate.totalExperienceYears} years tenure`}${secondCandidate.match.potentialInconsistencies.length > 0 ? " and flagged inconsistencies" : ""}.`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link
            href={`/jobs/${jobId}/candidates`}
            className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Candidate Dashboard</span>
          </Link>

          <span className="text-xs text-slate-500 font-mono">
            Comparing {candidates.length} candidates side-by-side
          </span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Candidate Side-by-Side Comparison
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Evaluates candidates against identical criteria: Required skills, Experience tenure, Projects, Inconsistencies, and Evidence quality.
          </p>
        </div>

        {/* Objective Ranking Rationale Alert */}
        <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 rounded-xl p-5 shadow-sm space-y-2 text-xs">
          <div className="flex items-center space-x-2 text-indigo-950 dark:text-indigo-200 font-bold">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h3>Transparent Criteria-Based Ranking Rationale</h3>
          </div>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            {differenceSummary}
          </p>
        </div>

        {/* Side-by-Side Comparison Matrix */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <th className="p-4 w-48 font-bold uppercase tracking-wider text-[11px] text-slate-500">
                  Criteria
                </th>
                {candidates.map(({ candidate, match }, idx) => (
                  <th key={candidate.id} className="p-4 min-w-[240px]">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-400">
                          #{idx + 1}
                        </span>
                        <ScoreBadge score={match.overallScore} size="sm" />
                      </div>
                      <Link
                        href={`/jobs/${jobId}/candidates/${candidate.id}`}
                        className="font-bold text-sm text-slate-900 dark:text-white hover:text-indigo-600 block"
                      >
                        {candidate.name}
                      </Link>
                      <span className="text-[11px] text-slate-500 block">
                        {candidate.location}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {/* Overall Score */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                <td className="p-4 font-bold text-slate-700 dark:text-slate-300 bg-slate-50/40 dark:bg-slate-950/40">
                  Overall Match Score
                </td>
                {candidates.map(({ match }) => (
                  <td key={match.candidateId} className="p-4">
                    <div className="font-mono font-bold text-base text-slate-900 dark:text-white">
                      {match.overallScore} / 100
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {match.aiRecommendation}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Required Skills Match */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                <td className="p-4 font-bold text-slate-700 dark:text-slate-300 bg-slate-50/40 dark:bg-slate-950/40">
                  Required Skills
                  <span className="block text-[10px] font-normal text-slate-400 mt-0.5">
                    Target: {job?.requirements.requiredSkills.join(", ")}
                  </span>
                </td>
                {candidates.map(({ match }) => (
                  <td key={match.candidateId} className="p-4 space-y-1.5">
                    <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                      ✓ {match.skillsAnalysis.requiredMatched.length}/{job?.requirements.requiredSkills.length} Matched
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {match.skillsAnalysis.requiredMatched.map((s) => (
                        <span
                          key={s.targetSkill}
                          className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 text-[10px] font-medium border border-emerald-200"
                        >
                          {s.targetSkill}
                        </span>
                      ))}
                    </div>
                    {match.skillsAnalysis.requiredMissing.length > 0 && (
                      <div className="text-[11px] text-rose-600 font-medium pt-1">
                        Missing: {match.skillsAnalysis.requiredMissing.join(", ")}
                      </div>
                    )}
                  </td>
                ))}
              </tr>

              {/* Transferable Skills */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                <td className="p-4 font-bold text-slate-700 dark:text-slate-300 bg-slate-50/40 dark:bg-slate-950/40">
                  Transferable Skills
                </td>
                {candidates.map(({ match }) => (
                  <td key={match.candidateId} className="p-4">
                    {match.skillsAnalysis.transferableSkills.length > 0 ? (
                      <div className="space-y-1">
                        {match.skillsAnalysis.transferableSkills.map((t, i) => (
                          <div key={i} className="text-[11px] text-blue-700 dark:text-blue-300">
                            <strong>{t.candidateSkill}</strong> → {t.targetSkill}
                            <p className="text-[10px] text-slate-500">{t.rationale}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px]">None detected</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Experience Tenure */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                <td className="p-4 font-bold text-slate-700 dark:text-slate-300 bg-slate-50/40 dark:bg-slate-950/40">
                  Verified Experience
                  <span className="block text-[10px] font-normal text-slate-400 mt-0.5">
                    Requirement: {job?.requirements.minExperienceYears}+ yrs
                  </span>
                </td>
                {candidates.map(({ candidate, match }) => (
                  <td key={candidate.id} className="p-4 space-y-1">
                    <div className="font-mono font-bold text-slate-900 dark:text-white">
                      {candidate.totalExperienceYears} years
                    </div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        match.experienceAnalysis.status === "exceeds"
                          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : match.experienceAnalysis.status === "meets"
                          ? "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          : "bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                      }`}
                    >
                      {match.experienceAnalysis.status}
                    </span>
                    <p className="text-[10px] text-slate-500">
                      {candidate.workHistory.length} documented role(s)
                    </p>
                  </td>
                ))}
              </tr>

              {/* Education */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                <td className="p-4 font-bold text-slate-700 dark:text-slate-300 bg-slate-50/40 dark:bg-slate-950/40">
                  Education &amp; Degree
                </td>
                {candidates.map(({ candidate, match }) => (
                  <td key={candidate.id} className="p-4 space-y-1">
                    <span className="font-semibold text-slate-900 dark:text-white block">
                      {candidate.education[0]?.degree || "Not found in resume"}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {candidate.education[0]?.institution || "N/A"}
                    </span>
                    <div className="text-[10px] text-emerald-600 font-medium">
                      Score: {match.scoreBreakdown.education}%
                    </div>
                  </td>
                ))}
              </tr>

              {/* ALG-AI-01 Bonus: Inconsistencies */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                <td className="p-4 font-bold text-slate-700 dark:text-slate-300 bg-slate-50/40 dark:bg-slate-950/40">
                  ALG-AI-01 Bonus Flags
                  <span className="block text-[10px] font-normal text-amber-600 mt-0.5">
                    Inconsistency checks
                  </span>
                </td>
                {candidates.map(({ match }) => (
                  <td key={match.candidateId} className="p-4">
                    {match.potentialInconsistencies.length === 0 ? (
                      <span className="inline-flex items-center space-x-1 text-emerald-700 font-medium text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Zero anomalies</span>
                      </span>
                    ) : (
                      <div className="space-y-1.5">
                        {match.potentialInconsistencies.map((incon) => (
                          <div
                            key={incon.id}
                            className="p-2 rounded bg-amber-50 dark:bg-amber-950/50 border border-amber-200 text-amber-800 dark:text-amber-200 text-[10px]"
                          >
                            <span className="font-bold block">⚠ {incon.flag}</span>
                            <span className="italic block text-[9px] mt-0.5">{incon.claim}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                ))}
              </tr>

              {/* Recruiter Decision */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                <td className="p-4 font-bold text-slate-700 dark:text-slate-300 bg-slate-50/40 dark:bg-slate-950/40">
                  Recruiter Decision
                </td>
                {candidates.map(({ candidate, match }) => (
                  <td key={candidate.id} className="p-4">
                    <span
                      className={`inline-block px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                        match.recruiterDecision === "shortlisted"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : match.recruiterDecision === "rejected"
                          ? "bg-rose-100 text-rose-800 border border-rose-300"
                          : match.recruiterDecision === "maybe"
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-slate-100 text-slate-700 border border-slate-300"
                      }`}
                    >
                      {match.recruiterDecision}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Detail Action */}
              <tr>
                <td className="p-4 bg-slate-50/40 dark:bg-slate-950/40" />
                {candidates.map(({ candidate }) => (
                  <td key={candidate.id} className="p-4">
                    <Link
                      href={`/jobs/${jobId}/candidates/${candidate.id}`}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition"
                    >
                      <span>Full Candidate File</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
