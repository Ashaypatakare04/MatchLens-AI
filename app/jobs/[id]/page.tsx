"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  FileUp,
  ArrowRight,
  X,
  ArrowLeftRight,
  Save,
  CheckCircle2,
  Sliders,
  Briefcase,
  GraduationCap,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Job, ExtractedJobRequirements } from "@/lib/types";

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.id;
  const [job, setJob] = useState<Job | null>(null);
  const [candidatesCount, setCandidatesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Editable requirements state
  const [requirements, setRequirements] = useState<ExtractedJobRequirements | null>(null);
  const [newRequiredSkill, setNewRequiredSkill] = useState("");
  const [newPreferredSkill, setNewPreferredSkill] = useState("");
  const [newResponsibility, setNewResponsibility] = useState("");
  const [showRawDescription, setShowRawDescription] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchJob() {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (res.ok) {
          const d = await res.json();
          if (isMounted && d.job) {
            setJob(d.job);
            setRequirements(d.job.requirements);
            setCandidatesCount(d.candidatesCount || 0);
          }
        }
      } catch (err) {
        console.error("Failed to load job profile:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchJob();
    return () => {
      isMounted = false;
    };
  }, [jobId]);

  // Handlers for requirements manipulation
  const handleAddRequiredSkill = () => {
    if (!requirements || !newRequiredSkill.trim()) return;
    const skill = newRequiredSkill.trim();
    if (requirements.requiredSkills.includes(skill)) return;

    setRequirements({
      ...requirements,
      requiredSkills: [...requirements.requiredSkills, skill],
      preferredSkills: requirements.preferredSkills.filter((s) => s !== skill),
    });
    setNewRequiredSkill("");
  };

  const handleRemoveRequiredSkill = (skill: string) => {
    if (!requirements) return;
    setRequirements({
      ...requirements,
      requiredSkills: requirements.requiredSkills.filter((s) => s !== skill),
    });
  };

  const handleMoveToPreferred = (skill: string) => {
    if (!requirements) return;
    setRequirements({
      ...requirements,
      requiredSkills: requirements.requiredSkills.filter((s) => s !== skill),
      preferredSkills: [...requirements.preferredSkills, skill],
    });
  };

  const handleAddPreferredSkill = () => {
    if (!requirements || !newPreferredSkill.trim()) return;
    const skill = newPreferredSkill.trim();
    if (requirements.preferredSkills.includes(skill)) return;

    setRequirements({
      ...requirements,
      preferredSkills: [...requirements.preferredSkills, skill],
      requiredSkills: requirements.requiredSkills.filter((s) => s !== skill),
    });
    setNewPreferredSkill("");
  };

  const handleRemovePreferredSkill = (skill: string) => {
    if (!requirements) return;
    setRequirements({
      ...requirements,
      preferredSkills: requirements.preferredSkills.filter((s) => s !== skill),
    });
  };

  const handleMoveToRequired = (skill: string) => {
    if (!requirements) return;
    setRequirements({
      ...requirements,
      preferredSkills: requirements.preferredSkills.filter((s) => s !== skill),
      requiredSkills: [...requirements.requiredSkills, skill],
    });
  };

  const handleAddResponsibility = () => {
    if (!requirements || !newResponsibility.trim()) return;
    setRequirements({
      ...requirements,
      keyResponsibilities: [...requirements.keyResponsibilities, newResponsibility.trim()],
    });
    setNewResponsibility("");
  };

  const handleRemoveResponsibility = (index: number) => {
    if (!requirements) return;
    setRequirements({
      ...requirements,
      keyResponsibilities: requirements.keyResponsibilities.filter((_, idx) => idx !== index),
    });
  };

  const handleSaveCriteria = async () => {
    if (!requirements) return;
    setIsSaving(true);
    setSaveSuccessMsg(null);

    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirements }),
      });

      if (res.ok) {
        const json = await res.json();
        setJob(json.job);
        setSaveSuccessMsg(
          json.rescoredCount !== undefined
            ? `Criteria saved successfully! Automatically re-evaluated ${json.rescoredCount} candidate profiles.`
            : "Requisition criteria updated successfully."
        );
        setTimeout(() => setSaveSuccessMsg(null), 6000);
      }
    } catch (err) {
      console.error("Failed to save criteria:", err);
      alert("Failed to save criteria changes.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8 text-slate-500 text-sm">
          Loading requisition criteria &amp; extracted requirements...
        </div>
      </div>
    );
  }

  if (!job || !requirements) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100">
        <Navbar />
        <div className="p-8 text-center text-slate-500 text-sm">Job requisition not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100 font-sans">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Requisition Header */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded">
                {job.company}
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {job.title}
              </h1>
              <p className="text-xs text-slate-500">
                {job.location} • {job.workMode} • {job.employmentType}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Link
                href={`/jobs/${job.id}/upload`}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition"
              >
                <FileUp className="w-3.5 h-3.5" />
                <span>Upload Resumes</span>
              </Link>

              <Link
                href={`/jobs/${job.id}/candidates`}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
              >
                <span>View Candidates ({candidatesCount})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Workflow Banner: Review & Confirm AI-Extracted Criteria */}
        <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl p-4 flex items-start space-x-3">
          <Sliders className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h3 className="font-bold text-indigo-900 dark:text-indigo-200">
              Recruiter Requirement Review &amp; Calibration
            </h3>
            <p className="text-indigo-700 dark:text-indigo-300 leading-relaxed">
              MatchLens extracts candidate screening criteria from the job posting. Recruiters maintain full ownership: you can promote, demote, add, or remove requirements at any time. Saving changes automatically updates scoring across all evaluated candidates.
            </p>
          </div>
        </div>

        {/* Success alert banner */}
        {saveSuccessMsg && (
          <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl p-4 flex items-center space-x-3 text-xs text-emerald-800 dark:text-emerald-200 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Criteria Editor Workspace */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Job Requirements &amp; Thresholds
              </h2>
              <p className="text-xs text-slate-500">
                Adjust criteria to match hiring committee priorities
              </p>
            </div>

            <button
              onClick={handleSaveCriteria}
              disabled={isSaving}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Saving & Re-scoring..." : "Save Criteria & Re-Score"}</span>
            </button>
          </div>

          {/* 1. Required Technical Skills */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Required Technical Skills ({requirements.requiredSkills.length})</span>
                <span className="text-[10px] font-normal text-slate-400">
                  (Candidates lacking these are marked with missing flags or transferable ceilings)
                </span>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              {requirements.requiredSkills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800 shadow-xs"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleMoveToPreferred(skill)}
                    className="p-0.5 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded text-emerald-600 hover:text-emerald-900"
                    title="Move to Preferred (Nice-to-Have)"
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveRequiredSkill(skill)}
                    className="p-0.5 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded text-slate-400 hover:text-rose-600"
                    title="Remove skill"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center space-x-2 pt-1 max-w-md">
              <input
                type="text"
                placeholder="Add required skill (e.g. Docker, TypeScript)..."
                value={newRequiredSkill}
                onChange={(e) => setNewRequiredSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddRequiredSkill())}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              <button
                type="button"
                onClick={handleAddRequiredSkill}
                className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
              >
                + Add Required
              </button>
            </div>
          </div>

          {/* 2. Preferred / Nice-to-Have Skills */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span>Preferred / Nice-to-Have Skills ({requirements.preferredSkills.length})</span>
                <span className="text-[10px] font-normal text-slate-400">
                  (Grants bonus alignment points without penalizing candidates if missing)
                </span>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              {requirements.preferredSkills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-xs font-semibold border border-blue-200 dark:border-blue-800 shadow-xs"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleMoveToRequired(skill)}
                    className="p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900 rounded text-blue-600 hover:text-blue-900"
                    title="Promote to Required Skill"
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemovePreferredSkill(skill)}
                    className="p-0.5 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded text-slate-400 hover:text-rose-600"
                    title="Remove skill"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center space-x-2 pt-1 max-w-md">
              <input
                type="text"
                placeholder="Add preferred skill (e.g. GraphQL, Tailwind CSS)..."
                value={newPreferredSkill}
                onChange={(e) => setNewPreferredSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddPreferredSkill())}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              <button
                type="button"
                onClick={handleAddPreferredSkill}
                className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                + Add Preferred
              </button>
            </div>
          </div>

          {/* 3. Experience & Education Thresholds */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5 mb-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Minimum Relevant Experience Threshold (Years)</span>
              </label>
              <input
                type="number"
                min="0"
                max="25"
                step="0.5"
                value={requirements.minExperienceYears}
                onChange={(e) =>
                  setRequirements({
                    ...requirements,
                    minExperienceYears: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Candidate engineering history is reconciled against this minimum bar.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5 mb-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                <span>Education &amp; Degree Requirement</span>
              </label>
              <input
                type="text"
                value={requirements.educationRequirement}
                onChange={(e) =>
                  setRequirements({
                    ...requirements,
                    educationRequirement: e.target.value,
                  })
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Degree specification (e.g. Bachelor&apos;s in Computer Science or equivalent).
              </p>
            </div>
          </div>

          {/* 4. Key Responsibilities */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
              <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
              <span>Core Responsibilities ({requirements.keyResponsibilities?.length || 0})</span>
            </label>

            <div className="space-y-2">
              {requirements.keyResponsibilities?.map((resp, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                >
                  <span className="text-slate-700 dark:text-slate-300 pr-2 leading-relaxed">
                    • {resp}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveResponsibility(idx)}
                    className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded text-slate-400 hover:text-rose-600 shrink-0"
                    title="Remove responsibility"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <input
                type="text"
                placeholder="Add core engineering responsibility..."
                value={newResponsibility}
                onChange={(e) => setNewResponsibility(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddResponsibility())}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              <button
                type="button"
                onClick={handleAddResponsibility}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-700 hover:bg-slate-800 text-white rounded-lg transition"
              >
                + Add Responsibility
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Raw Job Description */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <button
            onClick={() => setShowRawDescription((prev) => !prev)}
            className="w-full flex items-center justify-between text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600"
          >
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Original Job Description Source Text</span>
            </div>
            {showRawDescription ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showRawDescription && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <pre className="text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-4 rounded-lg whitespace-pre-wrap leading-relaxed border border-slate-200 dark:border-slate-800 max-h-96 overflow-y-auto">
                {job.rawDescription}
              </pre>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
