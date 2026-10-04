"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  PlusCircle,
  FileUp,
  RotateCcw,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Job, CandidateProfile, MatchAnalysis } from "@/lib/types";
import { ScoreBadge } from "@/components/ScoreBadge";

interface DashboardData {
  jobs: Job[];
  candidates: CandidateProfile[];
  matches: MatchAnalysis[];
}

export default function RecruiterDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/jobs");
      const jobJson = await res.json();
      const jobs: Job[] = jobJson.jobs || [];

      // Fetch candidates for primary job
      if (jobs.length > 0) {
        const primaryJob = jobs[0];
        const candRes = await fetch(`/api/jobs/${primaryJob.id}/candidates`);
        const candJson = await candRes.json();
        const candPairs = candJson.candidates || [];

        setData({
          jobs,
          candidates: candPairs.map((p: { candidate: CandidateProfile }) => p.candidate),
          matches: candPairs.map((p: { match: MatchAnalysis }) => p.match),
        });
      } else {
        setData({ jobs: [], candidates: [], matches: [] });
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const totalResumes = data?.candidates.length || 0;
  const analyzedCount = data?.matches.length || 0;
  const shortlistedCount =
    data?.matches.filter((m) => m.recruiterDecision === "shortlisted").length || 0;
  const reviewRequiredCount =
    data?.matches.filter(
      (m) => m.potentialInconsistencies.length > 0 || m.aiRecommendation === "Review Required"
    ).length || 0;

  const avgScore =
    analyzedCount > 0
      ? Math.round(
          (data?.matches.reduce((sum, m) => sum + m.overallScore, 0) || 0) / analyzedCount
        )
      : 0;

  const topCandidates = (data?.matches || [])
    .slice(0, 5)
    .map((match) => {
      const cand = data?.candidates.find((c) => c.id === match.candidateId);
      return { match, candidate: cand };
    })
    .filter((item) => item.candidate !== undefined);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Recruiter Command Center
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Real-time pipeline overview, matching metrics, and active hiring funnels
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/jobs/new"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Job</span>
            </Link>
            {data?.jobs[0] && (
              <Link
                href={`/jobs/${data.jobs[0].id}/upload`}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                <FileUp className="w-4 h-4 text-slate-500" />
                <span>Upload Resumes</span>
              </Link>
            )}
          </div>
        </div>

        {/* Funnel & Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Active Jobs
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {data?.jobs.length || 0}
              </span>
              <Briefcase className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-[11px] text-slate-500">Live search criteria</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Resumes
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {totalResumes}
              </span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-[11px] text-slate-500">PDF, DOCX &amp; TXT parsed</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Avg Match Score
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                {avgScore}
                <span className="text-xs font-normal text-slate-400 ml-0.5">/100</span>
              </span>
              <TrendingUp className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-[11px] text-slate-500">Across current candidates</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Review Required
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-amber-600 font-mono">
                {reviewRequiredCount}
              </span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-[11px] text-amber-600 font-medium">ALG-AI-01 Inconsistencies</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Shortlisted
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-emerald-600 font-mono">
                {shortlistedCount}
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-[11px] text-emerald-600 font-medium">Recruiter approved</p>
          </div>
        </div>

        {/* Visual Recruiter Pipeline Funnel */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Candidate Progression Funnel
            </h3>
            <span className="text-xs text-slate-500">Transparent pipeline stages</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-xs text-slate-500 font-medium">1. Uploaded</span>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {totalResumes}
              </div>
              <span className="text-[11px] text-slate-400">100% of pipeline</span>
            </div>

            <div className="p-4 rounded-lg bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 space-y-1">
              <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">2. Parsed &amp; Normalized</span>
              <div className="text-2xl font-bold font-mono text-blue-800 dark:text-blue-200">
                {totalResumes}
              </div>
              <span className="text-[11px] text-blue-600 dark:text-blue-400">Taxonomy mapped</span>
            </div>

            <div className="p-4 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-1">
              <span className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">3. Evaluated &amp; Ranked</span>
              <div className="text-2xl font-bold font-mono text-indigo-800 dark:text-indigo-200">
                {analyzedCount}
              </div>
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400">Weighted scores computed</span>
            </div>

            <div className="p-4 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-1">
              <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">4. Shortlisted</span>
              <div className="text-2xl font-bold font-mono text-emerald-800 dark:text-emerald-200">
                {shortlistedCount}
              </div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400">Ready for interview</span>
            </div>
          </div>
        </div>

        {/* Active Jobs & Top Candidates */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Job List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Active Positions</h2>
              <Link href="/jobs/new" className="text-xs text-indigo-600 hover:underline font-semibold">
                + New Role
              </Link>
            </div>

            <div className="space-y-3">
              {data?.jobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-300 transition space-y-3"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded">
                      {job.company}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white pt-1">
                      {job.title}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {job.location} • {job.workMode} • {job.employmentType}
                    </p>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    Required: {job.requirements.requiredSkills.join(", ")}
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-slate-500 font-medium">
                      {totalResumes} candidates analyzed
                    </span>
                    <Link
                      href={`/jobs/${job.id}/candidates`}
                      className="text-indigo-600 hover:text-indigo-700 font-semibold inline-flex items-center space-x-1"
                    >
                      <span>View Shortlist</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Ranked Candidates Table Preview */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Top Ranked Candidates
                </h2>
              </div>
              {data?.jobs[0] && (
                <Link
                  href={`/jobs/${data.jobs[0].id}/candidates`}
                  className="text-xs text-indigo-600 hover:underline font-semibold inline-flex items-center space-x-1"
                >
                  <span>View Full Ranked Dashboard</span>
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </Link>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              {topCandidates.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No candidates analyzed yet. Click &quot;Load Demo Dataset&quot; to populate.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {topCandidates.map(({ match, candidate }, index) => {
                    if (!candidate) return null;
                    const hasFlags = match.potentialInconsistencies.length > 0;

                    return (
                      <div
                        key={match.candidateId}
                        className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs font-bold font-mono">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <Link
                                href={`/jobs/${match.jobId}/candidates/${candidate.id}`}
                                className="font-bold text-sm text-slate-900 dark:text-white hover:text-indigo-600 truncate"
                              >
                                {candidate.name}
                              </Link>
                              {hasFlags && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                                  ⚠ Flagged Claim
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 truncate">
                              {candidate.totalExperienceYears} yrs exp •{" "}
                              {candidate.education[0]?.degree || "Degree on file"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 flex-shrink-0">
                          <div className="text-right hidden sm:block">
                            <div className="text-[11px] text-slate-500">Skills / Exp / Edu</div>
                            <div className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                              {match.scoreBreakdown.skills} • {match.scoreBreakdown.experience} •{" "}
                              {match.scoreBreakdown.education}
                            </div>
                          </div>

                          <ScoreBadge score={match.overallScore} size="md" />

                          <Link
                            href={`/jobs/${match.jobId}/candidates/${candidate.id}`}
                            className="p-2 text-slate-400 hover:text-indigo-600 transition"
                            title="Inspect Candidate"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
