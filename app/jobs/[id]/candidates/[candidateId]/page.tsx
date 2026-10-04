"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  GraduationCap,
  FolderGit2,
  Award,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  FileText,
  Sliders,
  Download,
  Save,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { ScoreBadge } from "@/components/ScoreBadge";
import { InconsistencyCard } from "@/components/InconsistencyCard";
import { CandidateProfile, MatchAnalysis, Job, RecruiterDecision } from "@/lib/types";

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  const candidateId = params.candidateId as string;

  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [match, setMatch] = useState<MatchAnalysis | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  // Recruiter actions state
  const [decision, setDecision] = useState<RecruiterDecision>("unreviewed");
  const [notes, setNotes] = useState("");
  const [isSavingDecision, setIsSavingDecision] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Expandable formula toggle
  const [showFormula, setShowFormula] = useState(false);

  useEffect(() => {
    const fetchCandidateData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/jobs/${jobId}/candidates/${candidateId}`);
        if (res.ok) {
          const json = await res.json();
          setCandidate(json.candidate);
          setMatch(json.match);
          setJob(json.job);
          setDecision(json.match.recruiterDecision || "unreviewed");
          setNotes(json.match.recruiterNotes || "");
        }
      } catch (err) {
        console.error("Failed to fetch candidate details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCandidateData();
  }, [jobId, candidateId]);

  const handleSaveDecision = async (newDecision: RecruiterDecision) => {
    setDecision(newDecision);
    setIsSavingDecision(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/candidates/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: newDecision, notes }),
      });
      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      }
    } catch (err) {
      console.error("Failed to update recruiter decision:", err);
    } finally {
      setIsSavingDecision(false);
    }
  };

  const handleSaveNotes = async () => {
    setIsSavingDecision(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/candidates/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, notes }),
      });
      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      }
    } catch (err) {
      console.error("Failed to save notes:", err);
    } finally {
      setIsSavingDecision(false);
    }
  };

  const handleDownloadAnalysis = () => {
    if (!candidate || !match) return;
    const reportData = {
      candidateProfile: candidate,
      matchEvaluation: match,
      jobRequirements: job?.requirements,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `MatchLens_Analysis_${candidate.name.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8 text-slate-500 text-sm">
          Loading candidate evaluation &amp; grounded citations...
        </div>
      </div>
    );
  }

  if (!candidate || !match) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100">
        <Navbar />
        <div className="flex-1 max-w-4xl mx-auto p-8 text-center space-y-4">
          <p className="text-slate-500">Candidate not found or analysis missing.</p>
          <Link
            href={`/jobs/${jobId}/candidates`}
            className="text-indigo-600 hover:underline font-semibold text-sm"
          >
            ← Return to Candidate Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const hasInconsistencies = match.potentialInconsistencies.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href={`/jobs/${jobId}/candidates`}
            className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Candidate Dashboard</span>
          </Link>

          <button
            onClick={handleDownloadAnalysis}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Analysis (JSON)</span>
          </button>
        </div>

        {/* Section 1: Candidate Overview & Match Hero */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                  {candidate.name}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                  {candidate.fileType.toUpperCase()}
                </span>
                {candidate.parsingConfidence === "high" ? (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
                    High Confidence Extraction
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200">
                    Review Parsing Warnings
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
                <span className="flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{candidate.email}</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{candidate.phone}</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{candidate.location}</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>{candidate.totalExperienceYears} yrs experience verified</span>
                </span>
              </div>
            </div>

            {/* Score & Recommendation Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-center sm:text-right">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Overall Matching Score
                </span>
                <span className="text-xs text-slate-400 block font-normal">
                  Matching score • Not hiring probability
                </span>
              </div>
              <ScoreBadge score={match.overallScore} size="lg" showLabel />
            </div>
          </div>

          {/* Recruiter Decision Action Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Recruiter Decision:
              </span>
              <button
                onClick={() => handleSaveDecision("shortlisted")}
                disabled={isSavingDecision}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 border ${
                  decision === "shortlisted"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-emerald-50"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Shortlist</span>
              </button>

              <button
                onClick={() => handleSaveDecision("maybe")}
                disabled={isSavingDecision}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 border ${
                  decision === "maybe"
                    ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-amber-50"
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Maybe / Re-review</span>
              </button>

              <button
                onClick={() => handleSaveDecision("rejected")}
                disabled={isSavingDecision}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 border ${
                  decision === "rejected"
                    ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-rose-50"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>

              {savedSuccess && (
                <span className="text-xs text-emerald-600 font-semibold ml-2">
                  ✓ Decision saved
                </span>
              )}
            </div>

            <div className="text-xs text-slate-500 font-medium">
              AI Recommendation: <strong className="text-indigo-600">{match.aiRecommendation}</strong>
            </div>
          </div>
        </div>

        {/* Section 2 & 3: Score Breakdown & Transparent Weights Formula */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Deterministic Score Breakdown
            </h2>
            <button
              onClick={() => setShowFormula((prev) => !prev)}
              className="inline-flex items-center space-x-1 text-xs text-indigo-600 font-semibold hover:underline"
            >
              <span>{showFormula ? "Hide Formula" : "How this score was calculated"}</span>
              {showFormula ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 font-medium">Skills ({job?.weights.skills}%)</span>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {match.scoreBreakdown.skills}
                <span className="text-xs font-normal text-slate-400">/100</span>
              </div>
              <span className="text-[10px] text-indigo-600 font-mono">
                +{match.weightedContributions.skills} pts
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 font-medium">Experience ({job?.weights.experience}%)</span>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {match.scoreBreakdown.experience}
                <span className="text-xs font-normal text-slate-400">/100</span>
              </div>
              <span className="text-[10px] text-indigo-600 font-mono">
                +{match.weightedContributions.experience} pts
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 font-medium">Responsibilities ({job?.weights.responsibilities}%)</span>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {match.scoreBreakdown.responsibilities}
                <span className="text-xs font-normal text-slate-400">/100</span>
              </div>
              <span className="text-[10px] text-indigo-600 font-mono">
                +{match.weightedContributions.responsibilities} pts
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 font-medium">Projects ({job?.weights.projects}%)</span>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {match.scoreBreakdown.projects}
                <span className="text-xs font-normal text-slate-400">/100</span>
              </div>
              <span className="text-[10px] text-indigo-600 font-mono">
                +{match.weightedContributions.projects} pts
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 font-medium">Education ({job?.weights.education}%)</span>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {match.scoreBreakdown.education}
                <span className="text-xs font-normal text-slate-400">/100</span>
              </div>
              <span className="text-[10px] text-indigo-600 font-mono">
                +{match.weightedContributions.education} pts
              </span>
            </div>
          </div>

          {/* Expandable Formula Explanation */}
          {showFormula && (
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-xs space-y-2 text-slate-600 dark:text-slate-300">
              <div className="font-semibold text-slate-900 dark:text-white">
                Formula Mechanics:
              </div>
              <p>
                Overall Score = (Skills × {job?.weights.skills}%) + (Experience × {job?.weights.experience}%) + (Responsibilities × {job?.weights.responsibilities}%) + (Projects × {job?.weights.projects}%) + (Education × {job?.weights.education}%).
              </p>
              <div className="font-mono text-[11px] bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                ({match.scoreBreakdown.skills} × {job?.weights.skills}%) + ({match.scoreBreakdown.experience} × {job?.weights.experience}%) + ({match.scoreBreakdown.responsibilities} × {job?.weights.responsibilities}%) + ({match.scoreBreakdown.projects} × {job?.weights.projects}%) + ({match.scoreBreakdown.education} × {job?.weights.education}%) = {match.overallScore} / 100
              </div>
              <p className="text-[11px] text-slate-500">
                * Scores are computed strictly by deterministic evaluation against configured job specifications, with zero fabricated confidence percentages.
              </p>
            </div>
          )}
        </div>

        {/* Section 4 & 5: Strong Matches & Missing Requirements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-900/60 p-6 shadow-sm space-y-3">
            <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <h3>Why This Candidate Matches ({match.strongMatches.length})</h3>
            </div>
            <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
              {match.strongMatches.map((m, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-rose-200 dark:border-rose-900/60 p-6 shadow-sm space-y-3">
            <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-300 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <h3>Missing Requirements &amp; Gaps ({match.missingRequirements.length})</h3>
            </div>
            {match.missingRequirements.length === 0 ? (
              <p className="text-xs text-slate-500">
                Zero required skills or prerequisites missing from candidate resume!
              </p>
            ) : (
              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                {match.missingRequirements.map((m, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-rose-600 font-bold">⚠</span>
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Section 13: ALG-AI-01 Bonus Inconsistencies Alert */}
        {hasInconsistencies && (
          <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-bold">
                ALG-AI-01 Bonus: Detected Inconsistencies &amp; Verification Flags
              </h3>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Rather than blindly rewarding keywords, MatchLens-AI detected potential discrepancies that require recruiter verification during screen.
            </p>

            <div className="space-y-3">
              {match.potentialInconsistencies.map((incon) => (
                <InconsistencyCard key={incon.id} inconsistency={incon} />
              ))}
            </div>
          </div>
        )}

        {/* Section 6: Detailed Skill Breakdown & Taxonomy */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Skill Analysis &amp; Normalization
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Required Skills */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Required Skills
              </h4>
              <div className="space-y-2 text-xs">
                {match.skillsAnalysis.requiredMatched.map((s, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-emerald-900 dark:text-emerald-200">
                        {s.targetSkill}
                      </span>
                      {s.matchType === "synonym" && (
                        <span className="ml-2 text-[10px] text-emerald-700 bg-emerald-100 dark:bg-emerald-900 px-1.5 py-0.5 rounded">
                          Synonym: &quot;{s.skill}&quot;
                        </span>
                      )}
                      {s.matchType === "transferable" && (
                        <span className="ml-2 text-[10px] text-blue-700 bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 rounded">
                          Transferable: &quot;{s.skill}&quot;
                        </span>
                      )}
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        {s.evidence}
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-700">
                      {(s.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}

                {match.skillsAnalysis.requiredMissing.map((s, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-rose-900 dark:text-rose-200">{s}</span>
                      <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5">
                        Not found in resume
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-rose-600">0%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Preferred Skills */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Preferred Skills
              </h4>
              <div className="space-y-2 text-xs">
                {match.skillsAnalysis.preferredMatched.map((s, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-indigo-900 dark:text-indigo-200">
                        {s.targetSkill}
                      </span>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        {s.evidence}
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-indigo-700">
                      {(s.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}

                {match.skillsAnalysis.preferredMissing.map((s, i) => (
                  <div
                    key={i}
                    className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 flex justify-between"
                  >
                    <span>{s}</span>
                    <span className="text-[11px]">Missing (Optional)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 7 & 8: Work Experience Timeline & Responsibilities Alignment */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Work History Timeline ({candidate.totalExperienceYears} yrs cumulative)
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              Requirement: {job?.requirements.minExperienceYears}+ yrs
            </span>
          </div>

          <div className="space-y-4">
            {candidate.workHistory.map((role) => (
              <div
                key={role.id}
                className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2 text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {role.title}
                    </span>
                    <span className="text-slate-500 ml-2">@ {role.company}</span>
                  </div>
                  <span className="font-mono text-slate-500 text-[11px] bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                    {role.startDate} – {role.endDate} (~{(role.calculatedDurationMonths / 12).toFixed(1)} yrs)
                  </span>
                </div>

                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {role.description}
                </p>

                {role.achievements && role.achievements.length > 0 && (
                  <div className="pt-1 space-y-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Key Highlights:
                    </span>
                    <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 pl-1 space-y-0.5">
                      {role.achievements.map((ach, idx) => (
                        <li key={idx}>{ach}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Job Responsibilities Alignment */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Comparison Against Role Responsibilities
            </h3>
            <div className="space-y-2 text-xs">
              {match.responsibilityAlignment.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-start justify-between gap-2"
                >
                  <div className="space-y-1">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      • {item.responsibility}
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Candidate Evidence: {item.candidateEvidence}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${
                      item.matchLevel === "strong"
                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200"
                        : item.matchLevel === "moderate"
                        ? "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {item.matchLevel} Match
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 9, 10, 11: Education, Projects, Certifications */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Education */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3 text-xs">
            <div className="flex items-center space-x-2 font-bold text-slate-900 dark:text-white">
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              <h3>Education</h3>
            </div>
            {candidate.education.map((edu, idx) => (
              <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg space-y-1">
                <span className="font-bold text-slate-900 dark:text-white block">
                  {edu.degree}
                </span>
                <span className="text-slate-500 block">{edu.institution}</span>
                {edu.graduationYear && (
                  <span className="text-[11px] text-slate-400">Class of {edu.graduationYear}</span>
                )}
              </div>
            ))}
          </div>

          {/* Projects */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3 text-xs">
            <div className="flex items-center space-x-2 font-bold text-slate-900 dark:text-white">
              <FolderGit2 className="w-4 h-4 text-indigo-600" />
              <h3>Projects</h3>
            </div>
            {candidate.projects.length === 0 ? (
              <p className="text-slate-500">No standalone projects listed.</p>
            ) : (
              candidate.projects.map((proj, idx) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg space-y-1">
                  <span className="font-bold text-slate-900 dark:text-white block">
                    {proj.title}
                  </span>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                    {proj.description}
                  </p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {proj.technologies.map((t) => (
                      <span
                        key={t}
                        className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 text-[10px] text-slate-600 border border-slate-200 dark:border-slate-800"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Certifications */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3 text-xs">
            <div className="flex items-center space-x-2 font-bold text-slate-900 dark:text-white">
              <Award className="w-4 h-4 text-indigo-600" />
              <h3>Certifications</h3>
            </div>
            {candidate.certifications.length === 0 ? (
              <p className="text-slate-500">No accredited certifications listed.</p>
            ) : (
              candidate.certifications.map((cert, idx) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg space-y-1">
                  <span className="font-bold text-slate-900 dark:text-white block">
                    {cert.name}
                  </span>
                  <span className="text-slate-500 block">
                    {cert.issuer} {cert.year ? `(${cert.year})` : ""}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Section 12: Evidence Citation Log */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Grounded Resume Citations ({match.evidenceLog.length})
              </h2>
            </div>
            <span className="text-xs text-slate-500">Every match linked to resume proof</span>
          </div>

          <div className="space-y-2">
            {match.evidenceLog.map((ev) => (
              <div
                key={ev.id}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {ev.claimOrRequirement}
                    </span>
                    <span className="text-[10px] text-slate-500 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                      {ev.section}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                    &quot;{ev.evidenceText}&quot;
                  </p>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    {ev.nature}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      ev.quality === "Strong"
                        ? "bg-emerald-100 text-emerald-800"
                        : ev.quality === "Moderate"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {ev.quality} Evidence
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 14: Grounded AI Executive Summary & Recruiter Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* AI Explanation */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              AI Match Synthesis &amp; Rationale
            </h3>
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {match.aiExplanation}
            </div>
          </div>

          {/* Recruiter Notes */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Recruiter Notes &amp; Human-in-the-Loop
              </h3>
              <button
                onClick={handleSaveNotes}
                disabled={isSavingDecision}
                className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Note</span>
              </button>
            </div>
            <textarea
              rows={5}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your interview observations, compensation notes, or technical screen focus areas..."
              className="w-full p-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
