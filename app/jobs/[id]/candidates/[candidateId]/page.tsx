"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  FolderGit2,
  Award,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Download,
  Save,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Cpu,
  Scale,
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

  // Expandable formula toggle (open by default for judges/recruiters)
  const [showFormula, setShowFormula] = useState(true);

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
  const weights = job?.weights || { skills: 35, experience: 25, responsibilities: 15, projects: 15, education: 10 };

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

        {/* 1. Candidate Identity & 2. Overall Match Score & 3. Recommendation */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                  {candidate.name}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase tracking-wider font-mono">
                  {candidate.fileType.toUpperCase()}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200">
                  {candidate.fileName}
                </span>
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
                  <span>{candidate.totalExperienceYears} yrs verified tenure</span>
                </span>
              </div>
            </div>

            {/* Score & Recommendation */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex-shrink-0">
              <div className="text-left sm:text-right">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Overall Match Score
                </span>
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block mt-0.5">
                  Recommendation: {match.aiRecommendation}
                </span>
                <span className="text-[10px] text-slate-400 block font-normal">
                  Matching score • Not hiring probability
                </span>
              </div>
              <ScoreBadge score={match.overallScore} size="lg" showLabel />
            </div>
          </div>
        </div>

        {/* 4. Why They Match & 5. Missing Requirements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-900/60 p-6 shadow-sm space-y-3">
            <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <h3>Why This Candidate Matches ({match.strongMatches.length})</h3>
            </div>
            <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
              {match.strongMatches.map((m, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <span className="text-emerald-600 font-bold flex-shrink-0">✓</span>
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
              <p className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-lg border border-emerald-200">
                ✓ No required skills or prerequisites missing from candidate resume.
              </p>
            ) : (
              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                {match.missingRequirements.map((m, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-rose-600 font-bold flex-shrink-0">⚠</span>
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* 6. Score Breakdown & "How This Score Was Calculated" */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Score Breakdown &amp; Calculation Formula
              </h2>
              <p className="text-xs text-slate-500">
                Overall Match: <strong className="font-mono text-slate-900 dark:text-white">{match.overallScore}/100</strong>. Configurable deterministic matching score, not probability of hiring success.
              </p>
            </div>
            <button
              onClick={() => setShowFormula((prev) => !prev)}
              className="inline-flex items-center space-x-1 text-xs text-indigo-600 font-semibold hover:underline self-start sm:self-auto"
            >
              <span>{showFormula ? "Hide Formula Details" : "How this score was calculated"}</span>
              {showFormula ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-500 font-semibold">Skills ({weights.skills}%)</span>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                {match.scoreBreakdown.skills}
                <span className="text-xs font-normal text-slate-400">/100</span>
              </div>
              <span className="text-[10px] text-indigo-600 font-mono block">
                Contribution: +{match.weightedContributions.skills} pts
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-500 font-semibold">Experience ({weights.experience}%)</span>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                {match.scoreBreakdown.experience}
                <span className="text-xs font-normal text-slate-400">/100</span>
              </div>
              <span className="text-[10px] text-indigo-600 font-mono block">
                Contribution: +{match.weightedContributions.experience} pts
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-500 font-semibold">Responsibilities ({weights.responsibilities}%)</span>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                {match.scoreBreakdown.responsibilities}
                <span className="text-xs font-normal text-slate-400">/100</span>
              </div>
              <span className="text-[10px] text-indigo-600 font-mono block">
                Contribution: +{match.weightedContributions.responsibilities} pts
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-500 font-semibold">Projects ({weights.projects}%)</span>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                {match.scoreBreakdown.projects}
                <span className="text-xs font-normal text-slate-400">/100</span>
              </div>
              <span className="text-[10px] text-indigo-600 font-mono block">
                Contribution: +{match.weightedContributions.projects} pts
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-500 font-semibold">Education ({weights.education}%)</span>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                {match.scoreBreakdown.education}
                <span className="text-xs font-normal text-slate-400">/100</span>
              </div>
              <span className="text-[10px] text-indigo-600 font-mono block">
                Contribution: +{match.weightedContributions.education} pts
              </span>
            </div>
          </div>

          {showFormula && (
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-xs space-y-2 text-slate-600 dark:text-slate-300">
              <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold">
                <Scale className="w-4 h-4 text-indigo-600" />
                <span>How This Score Was Calculated:</span>
              </div>
              <p>
                The overall match score is calculated deterministically by multiplying each dimension score by its configured weight:
              </p>
              <div className="font-mono text-[11px] bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800 leading-relaxed text-slate-800 dark:text-slate-200">
                ({match.scoreBreakdown.skills} × {weights.skills}%) + ({match.scoreBreakdown.experience} × {weights.experience}%) + ({match.scoreBreakdown.responsibilities} × {weights.responsibilities}%) + ({match.scoreBreakdown.projects} × {weights.projects}%) + ({match.scoreBreakdown.education} × {weights.education}%) = {match.overallScore} / 100
              </div>
              <p className="text-[11px] text-slate-500 italic">
                * Note: This score reflects objective requirement alignment against configured criteria. It is a decision-support metric, not an automated hiring decision.
              </p>
            </div>
          )}
        </div>

        {/* 7. Grounded Resume Citations (Evidence-First AI) */}
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

          <div className="space-y-2.5">
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
                      Source: {ev.section}
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

        {/* 8. Experience Timeline */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Work History Timeline ({candidate.totalExperienceYears} yrs cumulative tenure)
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              Job Req: {job?.requirements.minExperienceYears}+ yrs
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

        {/* 9. Potential Inconsistencies (ALG-AI-01 Bonus) */}
        {hasInconsistencies && (
          <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-bold">
                Potential Inconsistencies &amp; Verification Flags
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

        {/* 10. Education & 11. Projects & 12. Certifications */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Education */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3 text-xs">
            <div className="flex items-center space-x-2 font-bold text-slate-900 dark:text-white">
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              <h3>10. Education</h3>
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
              <h3>11. Projects</h3>
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
              <h3>12. Certifications</h3>
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

        {/* 13. Recruiter Decision & Notes (Human-in-the-Loop) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                13. Recruiter Decision &amp; Human-in-the-Loop
              </h2>
              <p className="text-xs text-slate-500">
                AI provides recommendations; the hiring decision remains 100% human-directed.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleSaveDecision("shortlisted")}
                disabled={isSavingDecision}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 border ${
                  decision === "shortlisted"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-emerald-50"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Shortlist</span>
              </button>

              <button
                onClick={() => handleSaveDecision("maybe")}
                disabled={isSavingDecision}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 border ${
                  decision === "maybe"
                    ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-amber-50"
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>Maybe</span>
              </button>

              <button
                onClick={() => handleSaveDecision("rejected")}
                disabled={isSavingDecision}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 border ${
                  decision === "rejected"
                    ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-rose-50"
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Reject</span>
              </button>

              {savedSuccess && (
                <span className="text-xs text-emerald-600 font-semibold ml-2">
                  ✓ Decision saved
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Recruiter Screening Notes
              </label>
              <button
                onClick={handleSaveNotes}
                disabled={isSavingDecision}
                className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Notes</span>
              </button>
            </div>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record your verification observations, technical screen questions, or compensation notes..."
              className="w-full p-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
