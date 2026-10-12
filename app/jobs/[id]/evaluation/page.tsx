"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileCheck2,
  AlertTriangle,
  Scale,
  Cpu,
  UserCheck,
  ShieldAlert,
  Download,
  TrendingUp,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { ScoreBadge } from "@/components/ScoreBadge";
import type { JobEvaluationReport } from "@/lib/types";

export default function JobEvaluationReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.id;

  const [report, setReport] = useState<JobEvaluationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchReport() {
      try {
        const res = await fetch(`/api/jobs/${jobId}/evaluation-report`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to load evaluation report.");
        }
        const data = await res.json();
        if (isMounted) setReport(data.report);
      } catch (err: unknown) {
        if (isMounted) setError(err instanceof Error ? err.message : "Error fetching report");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchReport();
    return () => {
      isMounted = false;
    };
  }, [jobId]);

  const handleDownloadMarkdown = () => {
    if (!report) return;

    const md = [
      `# MatchLens AI — Job Evaluation Report`,
      `**Requisition**: ${report.job.title} (${report.job.company})`,
      `**Job ID**: \`${report.job.id}\``,
      `**Generated At**: ${new Date().toISOString()}`,
      ``,
      `---`,
      ``,
      `## 1. Ground Truth & Defensibility Separation`,
      `### Observed Facts`,
      ...report.factsVsPredictionsVsJudgments.observedFacts.map((f) => `- ${f}`),
      ``,
      `### Automated Predictions`,
      ...report.factsVsPredictionsVsJudgments.automatedPredictions.map((p) => `- ${p}`),
      ``,
      `### Recruiter Judgments`,
      ...report.factsVsPredictionsVsJudgments.recruiterJudgments.map((j) => `- ${j}`),
      ``,
      `---`,
      ``,
      `## 2. Summary & Workflow Metrics`,
      `- **Total Candidates Ingested**: ${report.summary.totalCandidates}`,
      `- **Reviewed Candidates**: ${report.summary.reviewedCount} (${report.summary.decisionCompletionRatePercent}% completion)`,
      `- **Shortlisted**: ${report.summary.shortlistedCount}`,
      `- **Maybe / Hold**: ${report.summary.maybeCount}`,
      `- **Rejected**: ${report.summary.rejectedCount}`,
      `- **Unreviewed**: ${report.summary.unreviewedCount}`,
      `- **Ranking Disagreements**: ${report.summary.rankingDisagreementsCount}`,
      `- **Average Recruiter Trust (1-5)**: ${report.summary.averageTrustScore !== null ? report.summary.averageTrustScore : "N/A"}`,
      `- **Average Recruiter Usefulness (1-5)**: ${report.summary.averageUsefulnessScore !== null ? report.summary.averageUsefulnessScore : "N/A"}`,
      `- **Total Reported Time Saved**: ${report.summary.totalReportedTimeSavedMinutes} minutes`,
      ``,
      `---`,
      ``,
      `## 3. Ranking Quality & Agreement`,
      `- **Precision@3**: ${report.rankingMetrics.precisionAt3 !== null ? report.rankingMetrics.precisionAt3 : "N/A"}`,
      `- **Precision@5**: ${report.rankingMetrics.precisionAt5 !== null ? report.rankingMetrics.precisionAt5 : "N/A"}`,
      `- **Sample Size**: ${report.rankingMetrics.sampleSize}`,
      `> [!NOTE]`,
      `> ${report.rankingMetrics.limitationsNotice}`,
      ``,
      `---`,
      ``,
      `## 4. Candidate Rankings vs Recruiter Decisions`,
      `| Rank | Candidate | MatchLens Score | AI Recommendation | Recruiter Decision | Stage |`,
      `|:---:|---|:---:|:---:|:---:|:---:|`,
      ...report.candidateRankings.map(
        (c) =>
          `| #${c.rank} | ${c.candidateName} | ${c.overallScore}/100 | ${c.aiRecommendation} | ${c.recruiterDecision} | ${c.pipelineStage || "screening"} |`
      ),
      ``,
      `---`,
      ``,
      `## 5. Structured Disagreement Records`,
      report.disagreements.length === 0
        ? `No ranking disagreements recorded.`
        : report.disagreements
            .map(
              (d) =>
                `- **${d.candidateName}** (System Rank #${d.systemRank}, Score: ${d.systemScore}, Decision: ${d.recruiterDecision})\n  - Category: \`${d.category}\`\n  - Reason: \`${d.disagreementReason || "None"}\`\n  - Note: ${d.comment || "None"}`
            )
            .join("\n\n"),
    ].join("\n");

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evaluation-report-${report.job.title.toLowerCase().replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8 text-slate-500 text-sm">
          Generating recruiter evaluation report...
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100">
        <Navbar />
        <div className="max-w-4xl mx-auto p-6 mt-8">
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-sm">
            {error || "Report unavailable"}
          </div>
          <Link
            href={`/jobs/${jobId}/candidates`}
            className="mt-4 inline-flex items-center gap-1.5 text-xs text-indigo-600 font-semibold hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Candidates</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100">
      <Navbar />

      <main className="max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Navigation & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Link
            href={`/jobs/${jobId}/candidates`}
            className="inline-flex items-center space-x-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Candidate Rankings</span>
          </Link>

          <button
            onClick={handleDownloadMarkdown}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition self-start sm:self-auto"
          >
            <Download className="w-4 h-4" />
            <span>Export Evaluation Brief (.md)</span>
          </button>
        </div>

        {/* Requisition Header */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 uppercase tracking-wider">
                  Pilot Evaluation Protocol
                </span>
                <span className="text-xs text-slate-400">Requisition ID: {report.job.id}</span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {report.job.title}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {report.job.company} &bull; Requirements: {report.job.requirementsUsed.requiredSkills.length} Required Skills, {report.job.requirementsUsed.preferredSkills.length} Preferred Skills
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Decision Completion</span>
                <span className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
                  {report.summary.decisionCompletionRatePercent}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 1: Three-Way Separation of Concerns */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Scale className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Defensibility Triad: Distinguishing Facts, Predictions &amp; Judgments
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Observed Facts */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                <span>1. Observed Facts</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Empirical system data extracted directly from documents, timestamps, and database operations.
              </p>
              <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 list-disc list-inside pt-1">
                {report.factsVsPredictionsVsJudgments.observedFacts.map((fact, idx) => (
                  <li key={idx} className="leading-snug">{fact}</li>
                ))}
              </ul>
            </div>

            {/* 2. Automated Predictions */}
            <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-900/60 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">
                <Cpu className="w-4 h-4 text-indigo-600" />
                <span>2. Automated Predictions</span>
              </div>
              <p className="text-[11px] text-indigo-700/70 dark:text-indigo-300/70">
                Deterministic scores, semantic projections, and candidate recommendations produced by MatchLens AI algorithms.
              </p>
              <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 list-disc list-inside pt-1">
                {report.factsVsPredictionsVsJudgments.automatedPredictions.map((pred, idx) => (
                  <li key={idx} className="leading-snug">{pred}</li>
                ))}
              </ul>
            </div>

            {/* 3. Recruiter Judgments */}
            <div className="p-4 bg-amber-50/50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/60 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                <UserCheck className="w-4 h-4 text-amber-600" />
                <span>3. Recruiter Judgments</span>
              </div>
              <p className="text-[11px] text-amber-700/70 dark:text-amber-300/70">
                Human hiring authority decisions, subjective evaluations, and qualitative override reasons.
              </p>
              <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 list-disc list-inside pt-1">
                {report.factsVsPredictionsVsJudgments.recruiterJudgments.map((judg, idx) => (
                  <li key={idx} className="leading-snug">{judg}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* SECTION 2: Key Metric Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Shortlisted</span>
            <div className="text-xl font-extrabold text-emerald-600 font-mono mt-1">
              {report.summary.shortlistedCount}
            </div>
            <span className="text-[10px] text-slate-400">of {report.summary.totalCandidates} candidates</span>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Rejected / Maybe</span>
            <div className="text-xl font-extrabold text-slate-700 dark:text-slate-300 font-mono mt-1">
              {report.summary.rejectedCount + report.summary.maybeCount}
            </div>
            <span className="text-[10px] text-slate-400">{report.summary.maybeCount} held, {report.summary.rejectedCount} rejected</span>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Ranking Disagreements</span>
            <div className="text-xl font-extrabold text-rose-600 font-mono mt-1">
              {report.summary.rankingDisagreementsCount}
            </div>
            <span className="text-[10px] text-slate-400">flagged during pilot</span>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Recruiter Trust</span>
            <div className="text-xl font-extrabold text-indigo-600 font-mono mt-1">
              {report.summary.averageTrustScore !== null ? `${report.summary.averageTrustScore}` : "—"}
              <span className="text-xs font-normal text-slate-400">/5.0</span>
            </div>
            <span className="text-[10px] text-slate-400">explanation clarity</span>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Usefulness Score</span>
            <div className="text-xl font-extrabold text-blue-600 font-mono mt-1">
              {report.summary.averageUsefulnessScore !== null ? `${report.summary.averageUsefulnessScore}` : "—"}
              <span className="text-xs font-normal text-slate-400">/5.0</span>
            </div>
            <span className="text-[10px] text-slate-400">perceived utility</span>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Reported Time Saved</span>
            <div className="text-xl font-extrabold text-teal-600 font-mono mt-1">
              {report.summary.totalReportedTimeSavedMinutes}m
            </div>
            <span className="text-[10px] text-slate-400">total minutes</span>
          </div>
        </div>

        {/* SECTION 3: Small-N Ranking Quality & Limitations Banner */}
        <div className="p-4 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Ranking Measures &amp; Statistical Caution (N={report.rankingMetrics.sampleSize} Evaluated Candidates)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
            <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-amber-200 dark:border-amber-900">
              <span className="text-slate-500 font-semibold">Precision@3 (Top 3 Candidates Shortlisted):</span>
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                {report.rankingMetrics.precisionAt3 !== null ? `${Math.round(report.rankingMetrics.precisionAt3 * 100)}%` : "Insufficient Candidates (<3)"}
              </div>
            </div>
            <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-amber-200 dark:border-amber-900">
              <span className="text-slate-500 font-semibold">Precision@5 (Top 5 Candidates Shortlisted):</span>
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                {report.rankingMetrics.precisionAt5 !== null ? `${Math.round(report.rankingMetrics.precisionAt5 * 100)}%` : "Insufficient Candidates (<5)"}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed italic pt-1">
            {report.rankingMetrics.limitationsNotice}
          </p>
        </div>

        {/* SECTION 4: Candidate Rankings vs Recruiter Decisions Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Candidate Rankings vs. Recruiter Actions ({report.candidateRankings.length})
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Candidate</th>
                  <th className="py-2.5 px-3">System Score</th>
                  <th className="py-2.5 px-3">AI Recommendation</th>
                  <th className="py-2.5 px-3">Recruiter Decision</th>
                  <th className="py-2.5 px-3">Flags</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {report.candidateRankings.map((c) => (
                  <tr key={c.candidateId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-mono font-bold text-slate-500">#{c.rank}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                      {c.candidateName}
                    </td>
                    <td className="py-3 px-3">
                      <ScoreBadge score={c.overallScore} size="sm" />
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                        {c.aiRecommendation}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          c.recruiterDecision === "shortlisted"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                            : c.recruiterDecision === "rejected"
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300"
                            : c.recruiterDecision === "maybe"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {c.recruiterDecision}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px]">
                      {c.potentialInconsistenciesCount > 0 ? (
                        <span className="text-amber-600 font-semibold">{c.potentialInconsistenciesCount} flag(s)</span>
                      ) : (
                        <span className="text-slate-400">Clean</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        href={`/jobs/${jobId}/candidates/${c.candidateId}`}
                        className="text-indigo-600 hover:underline font-semibold"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 5: Disagreement Feedback & Common Reasons */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Ranking Disagreements &amp; Calibration Feedback ({report.disagreements.length})
              </h2>
            </div>
          </div>

          {/* Breakdown by structured reason */}
          {Object.keys(report.commonDisagreementReasons).length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Primary Disagreement Causes:
              </span>
              <div className="flex flex-wrap gap-2">
                {Object.entries(report.commonDisagreementReasons).map(([reason, count]) => (
                  <span
                    key={reason}
                    className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold"
                  >
                    {reason.replace(/_/g, " ")}: <strong>{count}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          {report.disagreements.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No ranking disagreements recorded for this requisition.</p>
          ) : (
            <div className="space-y-3 pt-2">
              {report.disagreements.map((d, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {d.candidateName} (System #{d.systemRank}, Score: {d.systemScore})
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold uppercase">
                      {d.category.replace(/_/g, " ")}
                    </span>
                  </div>
                  {d.disagreementReason && (
                    <p className="text-indigo-600 dark:text-indigo-400 font-semibold text-[11px]">
                      Reason: {d.disagreementReason.replace(/_/g, " ")}
                    </p>
                  )}
                  {d.comment && (
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] italic bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                      &quot;{d.comment}&quot;
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
