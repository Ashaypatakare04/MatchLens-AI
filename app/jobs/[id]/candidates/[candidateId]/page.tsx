"use client";

import { useEffect, useState, useMemo } from "react";
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
  MinusCircle,
  History,
  FileDown,
  Trash2,
  SlidersHorizontal,
  FileText,
  MessageSquare,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { ScoreBadge } from "@/components/ScoreBadge";
import { InconsistencyCard } from "@/components/InconsistencyCard";
import { PilotFeedbackModal } from "@/components/PilotFeedbackModal";
import {
  CandidateProfile,
  MatchAnalysis,
  Job,
  RecruiterDecision,
  PipelineStage,
  RecruiterFeedbackReason,
  RecruiterFeedback,
} from "@/lib/types";
import { computeScoreDeficit } from "@/lib/engine/deficit-calculator";
import { generateCandidateEvidencePackMarkdown } from "@/lib/engine/export-service";
import { anonymizeCandidateProfile } from "@/lib/security/anonymizer";

export default function CandidateDetailPage() {
  const params = useParams();
  const jobId = params.id as string;
  const candidateId = params.candidateId as string;
  const router = useRouter();

  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [match, setMatch] = useState<MatchAnalysis | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  // Recruiter actions state
  const [decision, setDecision] = useState<RecruiterDecision>("unreviewed");
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>("screening");
  const [notes, setNotes] = useState("");
  const [isSavingDecision, setIsSavingDecision] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Bias reduction and GDPR delete
  const [anonymizedMode, setAnonymizedMode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloadingResume, setIsDownloadingResume] = useState(false);

  // Model calibration & override feedback
  const [feedbackReason, setFeedbackReason] = useState<RecruiterFeedbackReason>("other");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showPilotFeedbackModal, setShowPilotFeedbackModal] = useState(false);

  // Expandable formula toggle (open by default for judges/recruiters)
  const [showFormula, setShowFormula] = useState(true);

  const displayCandidate = useMemo(() => {
    if (!candidate) return null;
    return anonymizedMode ? anonymizeCandidateProfile(candidate, 1) : candidate;
  }, [candidate, anonymizedMode]);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const res = await fetch(`/api/jobs/${jobId}/candidates/${candidateId}`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted) {
            setCandidate(json.candidate);
            setMatch(json.match);
            setJob(json.job);
            setDecision(json.match.recruiterDecision || "unreviewed");
            setNotes(json.match.recruiterNotes || "");
            setPipelineStage(json.match.pipelineStage || "screening");
            if (json.match.recruiterFeedback) {
              setFeedbackReason(json.match.recruiterFeedback.reason || "other");
              setFeedbackComment(json.match.recruiterFeedback.comment || "");
            }

            // Log non-PII inspection telemetry for pilot metrics
            fetch(`/api/jobs/${jobId}/telemetry`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                eventType: "candidate_detail_inspected",
                candidateId,
              }),
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.error("Failed to fetch candidate details:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [jobId, candidateId]);

  const handleSaveDecision = async (
    newDecision: RecruiterDecision,
    newStage?: PipelineStage,
    customFeedback?: RecruiterFeedback
  ) => {
    setDecision(newDecision);
    if (newStage) setPipelineStage(newStage);
    setIsSavingDecision(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/candidates/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: newDecision,
          notes,
          pipelineStage: newStage || pipelineStage,
          feedback: customFeedback,
        }),
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
        body: JSON.stringify({
          decision,
          notes,
          pipelineStage,
        }),
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

  const handleDownloadEvidencePack = () => {
    if (!candidate || !match || !job) return;
    const md = generateCandidateEvidencePackMarkdown(candidate, match, job);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evidence-pack-${candidate.name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadResume = async () => {
    setIsDownloadingResume(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/candidates/${candidateId}/document`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Original resume document not available.");
        return;
      }
      const data = await res.json();
      if (data.downloadUrl) {
        window.open(data.downloadUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.error("Failed to download resume:", err);
      alert("Failed to access original resume document.");
    } finally {
      setIsDownloadingResume(false);
    }
  };

  const handleDeleteCandidate = async () => {
    if (
      !confirm(
        "Are you sure you want to permanently delete this candidate's profile and match records per GDPR / Right-to-Delete compliance? This action cannot be undone."
      )
    ) {
      return;
    }
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/candidates/${candidateId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        alert("Candidate profile purged successfully.");
        router.push(`/jobs/${jobId}/candidates`);
      }
    } catch (err) {
      console.error("Failed to delete candidate:", err);
      alert("Failed to purge candidate record.");
    } finally {
      setIsDeleting(false);
    }
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
  const deficitReport = job ? computeScoreDeficit(match, job) : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation Breadcrumb & Top Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Link
            href={`/jobs/${jobId}/candidates`}
            className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Candidate Dashboard</span>
          </Link>

          <div className="flex items-center space-x-2 flex-wrap">
            {/* Anonymized Mode Toggle */}
            <button
              onClick={() => setAnonymizedMode((prev) => !prev)}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                anonymizedMode
                  ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800 shadow-sm"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50"
              }`}
              title="Toggle Blind Screening Mode to reduce pedigree and demographic bias"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              <span>{anonymizedMode ? "Anonymized Mode: ON" : "Blind Screening Mode"}</span>
            </button>

            {/* Export Evidence Pack */}
            <button
              onClick={handleDownloadEvidencePack}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
              title="Download structured Hiring Committee Evidence Pack in Markdown"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Export Evidence Pack (.md)</span>
            </button>

            {/* View Original Resume */}
            <button
              onClick={handleDownloadResume}
              disabled={isDownloadingResume}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
              title="View or download candidate's original uploaded resume file from private storage"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              <span>{isDownloadingResume ? "Opening..." : "View Original Resume"}</span>
            </button>

            {/* Pilot Validation Feedback */}
            <button
              onClick={() => setShowPilotFeedbackModal(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition shadow-sm"
              title="Record structured pilot feedback on ranking and citations"
            >
              <MessageSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Pilot Feedback</span>
            </button>

            {/* Download JSON */}
            <button
              onClick={handleDownloadAnalysis}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Raw JSON</span>
            </button>
          </div>
        </div>

        {/* 1. Candidate Identity & 2. Overall Match Score & 3. Recommendation */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                  {displayCandidate?.name}
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
                  <span>{displayCandidate?.email}</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{displayCandidate?.phone}</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{displayCandidate?.location}</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Total: {candidate.totalExperienceYears} yrs | Relevant: <strong className="text-slate-900 dark:text-white">{match.relevantExperienceYears ?? match.experienceAnalysis?.relevantExperienceYears ?? candidate.totalExperienceYears} yrs</strong>
                  </span>
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

        {/* 6A. Score Deficit Analysis ("Why Didn't This Candidate Score Higher?") */}
        {deficitReport && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <MinusCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Score Deficit Analysis: Why Didn&apos;t This Candidate Score Higher?
                </h2>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-500">
                Total Deficit: <strong className="text-rose-600 dark:text-rose-400">-{deficitReport.totalPointsLost} pts</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Direct Coverage</span>
                <div className="text-base font-bold text-emerald-600 font-mono mt-0.5">
                  {deficitReport.coverage.directRequiredCount} / {deficitReport.coverage.totalRequiredCount}
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Transferable Matches</span>
                <div className="text-base font-bold text-blue-600 font-mono mt-0.5">
                  {deficitReport.coverage.transferableRequiredCount}
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Missing Direct Evidence</span>
                <div className="text-base font-bold text-rose-600 font-mono mt-0.5">
                  {deficitReport.coverage.missingRequiredCount}
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Verification Flags</span>
                <div className="text-base font-bold text-amber-600 font-mono mt-0.5">
                  {match.potentialInconsistencies.length}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Itemized Point Deductions (-{deficitReport.totalPointsLost} pts)
              </h3>
              {deficitReport.pointsLost.length === 0 ? (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 text-xs text-emerald-800 dark:text-emerald-300">
                  ✓ Candidate received maximum evaluation credit across all requirement dimensions.
                </div>
              ) : (
                <div className="space-y-2">
                  {deficitReport.pointsLost.map((deficit, dIdx) => (
                    <div
                      key={dIdx}
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {deficit.requirement}
                          </span>
                          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500">
                            {deficit.category.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400">
                          {deficit.reason}
                        </p>
                        <p className="text-[11px] text-indigo-700 dark:text-indigo-400 font-medium">
                          Recruiter Screen Tip: {deficit.actionableGuidance}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded border border-rose-200 dark:border-rose-900 flex-shrink-0 self-start">
                        -{deficit.pointsLost} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6B. Requirement-Level Evaluation Matrix (Section 5) */}
        {match.requirementMatches && match.requirementMatches.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Cpu className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Independent Requirement-Level Evaluation ({match.requirementMatches.length})
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                5-Level Evidence &amp; Grounded Citations
              </span>
            </div>

            <div className="space-y-3">
              {match.requirementMatches.map((req, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {req.requirement}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500">
                          {req.category === "required_skill" ? "Required Skill" : "Preferred Skill"}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                            req.matchType === "DIRECT MATCH"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300"
                              : req.matchType === "TRANSFERABLE / PARTIAL MATCH"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300"
                              : req.matchType === "WEAK / RELATED EVIDENCE"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300"
                              : req.matchType === "CONFLICTING / UNCERTAIN"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300"
                          }`}
                        >
                          {req.matchType}
                        </span>
                        {typeof req.evidenceLevel === "number" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            Level {req.evidenceLevel} Evidence
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 self-start sm:self-auto font-mono text-xs">
                      <span className="text-slate-500">
                        Score: <strong className="text-slate-900 dark:text-white">{req.semanticScore}/100</strong>
                      </span>
                      {req.scoreContribution !== undefined && (
                        <span className="text-indigo-600 font-bold">
                          +{req.scoreContribution} pts
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                    <strong>Reasoning:</strong> {req.explanation}
                  </p>

                  <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                    &quot;{req.evidence}&quot;
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6C. Contextual Transferable Skills Breakdown (Section 12) */}
        {match.skillsAnalysis.transferableSkills.length > 0 && (
          <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl p-6 shadow-sm space-y-3 text-xs">
            <div className="flex items-center space-x-2 text-blue-900 dark:text-blue-200 font-bold text-sm">
              <Scale className="w-5 h-5 text-blue-600" />
              <h3>Contextual Transferable Competencies ({match.skillsAnalysis.transferableSkills.length})</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              MatchLens identifies technical counterparts where core architecture translates across frameworks, clouds, or runtimes (e.g., component-based SPAs, cloud primitives, relational SQL). Transferable credit is capped and never equals direct skill credit.
            </p>
            <div className="space-y-2 pt-1">
              {match.skillsAnalysis.transferableSkills.map((t, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-blue-200 dark:border-blue-800 space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-blue-800 dark:text-blue-300">
                      Candidate: {t.candidateSkill}
                    </span>
                    <span className="text-slate-400">→</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      Target Job Requirement: {t.targetSkill}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                    {t.rationale}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

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

        {/* 13. Recruiter Decision, Pipeline Stage & Human-in-the-Loop */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                13. Recruiter Decision &amp; Pipeline Governance
              </h2>
              <p className="text-xs text-slate-500">
                AI provides decision support; hiring workflows and state transitions remain 100% recruiter-governed.
              </p>
            </div>

            {/* Pipeline Stage Dropdown */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Stage:</span>
              <select
                value={pipelineStage}
                onChange={(e) => handleSaveDecision(decision, e.target.value as PipelineStage)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="screening">1. Initial Screening</option>
                <option value="technical_review">2. Technical Review</option>
                <option value="interview">3. Interview Loop</option>
                <option value="offer">4. Offer Extended</option>
                <option value="archived">5. Archived</option>
              </select>
            </div>
          </div>

          {/* Decision Buttons Grid */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Recruiter Action:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <button
                onClick={() => handleSaveDecision("shortlisted")}
                disabled={isSavingDecision}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 border ${
                  decision === "shortlisted"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Shortlist</span>
              </button>

              <button
                onClick={() => handleSaveDecision("request_interview")}
                disabled={isSavingDecision}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 border ${
                  decision === "request_interview"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Tech Screen</span>
              </button>

              <button
                onClick={() => handleSaveDecision("request_code_sample")}
                disabled={isSavingDecision}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 border ${
                  decision === "request_code_sample"
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                }`}
              >
                <FolderGit2 className="w-3.5 h-3.5" />
                <span>Code Sample</span>
              </button>

              <button
                onClick={() => handleSaveDecision("maybe")}
                disabled={isSavingDecision}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 border ${
                  decision === "maybe"
                    ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Hold / Maybe</span>
              </button>

              <button
                onClick={() => handleSaveDecision("needs_verification")}
                disabled={isSavingDecision}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 border ${
                  decision === "needs_verification"
                    ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-orange-50 dark:hover:bg-orange-950/40"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verify Flags</span>
              </button>

              <button
                onClick={() => handleSaveDecision("rejected")}
                disabled={isSavingDecision}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 border ${
                  decision === "rejected"
                    ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>
            </div>
            {savedSuccess && (
              <span className="text-xs text-emerald-600 font-semibold block pt-1">
                ✓ Decision and stage updated
              </span>
            )}
          </div>

          {/* Model Calibration & Feedback Prompt */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setShowFeedbackModal((prev) => !prev)}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center space-x-1"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>
                {showFeedbackModal ? "Hide Calibration Feedback" : "Calibrate Matching / Explain Override"}
              </span>
            </button>

            {showFeedbackModal && (
              <div className="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    Recruiter Calibration Feedback Loop
                  </h4>
                  <p className="text-slate-500 text-[11px]">
                    If your decision departs from the AI score, record the underlying reason to refine job weights and transferable rules.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Calibration Reason:
                    </label>
                    <select
                      value={feedbackReason}
                      onChange={(e) => setFeedbackReason(e.target.value as RecruiterFeedbackReason)}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    >
                      <option value="required_skill_too_strict">Required skill criteria was too strict</option>
                      <option value="equivalent_experience">Candidate possesses equivalent experience not fully credited</option>
                      <option value="weight_mismatch">Configured scoring weights misaligned with role reality</option>
                      <option value="project_undervalued">Project / practical proof was undervalued</option>
                      <option value="culture_fit_concern">Concerns regarding collaboration or team alignment</option>
                      <option value="other">Other recruiter discretion</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Rationale Comment:
                    </label>
                    <input
                      type="text"
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder="e.g. Extensive Vue experience compensates for React requirement"
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      const feedbackObj: RecruiterFeedback = {
                        overrideType: match.overallScore < 60 ? "promoted_above_score" : "neutral_calibration",
                        reason: feedbackReason,
                        comment: feedbackComment,
                        timestamp: new Date().toISOString(),
                        recruiterId: "recruiter-default",
                      };
                      handleSaveDecision(decision, pipelineStage, feedbackObj);
                      setShowFeedbackModal(false);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition"
                  >
                    Save Calibration Record
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Recruiter Screening Notes */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Recruiter Private Notes
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
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record your verification observations, technical screen questions, or compensation notes..."
              className="w-full p-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* 14. Auditable Decision Trail */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 font-bold text-slate-900 dark:text-white text-base">
            <History className="w-5 h-5 text-indigo-600" />
            <h2>14. Auditable Decision History &amp; Timeline</h2>
          </div>
          <p className="text-xs text-slate-500">
            Immutable tracking of recruiter actions, status transitions, and review notes for compliance and calibration.
          </p>
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[11px] text-slate-500 font-mono">
              <span>Last Evaluated: {new Date(match.analyzedAt).toLocaleString()}</span>
              <span>Pipeline Stage: <strong className="uppercase text-indigo-600">{pipelineStage}</strong></span>
              <span>Current Status: <strong className="uppercase text-slate-900 dark:text-white">{decision}</strong></span>
            </div>
            {match.decisionTimestamp && (
              <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                Recruiter status updated: {new Date(match.decisionTimestamp).toLocaleString()}
              </p>
            )}
            {notes ? (
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white">Active Screening Notes: </span>
                <span>{notes}</span>
              </div>
            ) : (
              <p className="text-slate-400 italic text-[11px]">
                No private recruiter notes recorded yet.
              </p>
            )}
          </div>
        </div>

        {/* 15. Compliance & Right-to-Delete */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-rose-200 dark:border-rose-950/60 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">
              Data Privacy &amp; GDPR Compliance (Right to Delete)
            </h3>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Permanently purges this candidate&apos;s parsed resume, extract vectors, and evaluation analysis from persistent storage.
            </p>
          </div>

          <button
            onClick={handleDeleteCandidate}
            disabled={isDeleting}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-semibold border border-rose-200 dark:border-rose-800 transition flex-shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? "Purging Record..." : "Delete Candidate Record"}</span>
          </button>
        </div>

        {/* Phase 8 Pilot Validation Modal */}
        <PilotFeedbackModal
          isOpen={showPilotFeedbackModal}
          onClose={() => setShowPilotFeedbackModal(false)}
          jobId={jobId}
          candidateId={candidateId}
          candidateName={candidate?.name}
          systemScore={match?.overallScore}
        />
      </main>
    </div>
  );
}
