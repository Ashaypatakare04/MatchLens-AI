"use client";

import { useState } from "react";
import {
  X,
  MessageSquare,
  AlertCircle,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import type { PilotFeedbackCategory, PilotDisagreementReason } from "@/lib/types";

interface PilotFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  candidateId?: string;
  candidateName?: string;
  systemScore?: number;
  onFeedbackSubmitted?: () => void;
}

const CATEGORY_OPTIONS: Array<{ value: PilotFeedbackCategory; label: string; isDisagreement?: boolean }> = [
  { value: "ranking_correct", label: "Ranking seems correct" },
  { value: "relevant_ranked_too_low", label: "Relevant candidate ranked too low", isDisagreement: true },
  { value: "irrelevant_ranked_too_high", label: "Irrelevant candidate ranked too high", isDisagreement: true },
  { value: "evidence_unsupported", label: "Evidence does not support claim" },
  { value: "qualification_missing", label: "Qualification or skill is missing from profile" },
  { value: "transferable_skill_incorrect", label: "Transferable-skill assessment is incorrect", isDisagreement: true },
  { value: "inconsistency_misleading", label: "Inconsistency flag is misleading" },
  { value: "workflow_confusing", label: "Workflow or UI is confusing" },
  { value: "processing_failed", label: "Processing failed or incomplete" },
  { value: "other", label: "Other" },
];

const DISAGREEMENT_REASON_OPTIONS: Array<{ value: PilotDisagreementReason; label: string }> = [
  { value: "relevant_experience_overlooked", label: "Relevant experience overlooked" },
  { value: "transferable_skill_incorrect", label: "Transferable skill assessed incorrectly" },
  { value: "qualification_misunderstood", label: "Qualification requirement misunderstood" },
  { value: "unsupported_candidate_claim", label: "Unsupported candidate claim in resume" },
  { value: "seniority_mismatch", label: "Seniority mismatch" },
  { value: "duration_misinterpreted", label: "Incorrect employment-duration interpretation" },
  { value: "other", label: "Other disagreement reason" },
];

export function PilotFeedbackModal({
  isOpen,
  onClose,
  jobId,
  candidateId,
  candidateName,
  systemScore,
  onFeedbackSubmitted,
}: PilotFeedbackModalProps) {
  const [category, setCategory] = useState<PilotFeedbackCategory>("ranking_correct");
  const [disagreementReason, setDisagreementReason] = useState<PilotDisagreementReason | "">("");
  const [trustScore, setTrustScore] = useState<number | null>(4);
  const [usefulnessScore, setUsefulnessScore] = useState<number | null>(4);
  const [timeSavedMinutes, setTimeSavedMinutes] = useState<number | "">(15);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedCategoryObj = CATEGORY_OPTIONS.find((c) => c.value === category);
  const showDisagreementReason =
    selectedCategoryObj?.isDisagreement || category === "relevant_ranked_too_low" || category === "irrelevant_ranked_too_high";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/jobs/${jobId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId,
          category,
          disagreementReason: disagreementReason ? disagreementReason : undefined,
          perceivedTrustScore: trustScore ?? undefined,
          perceivedUsefulnessScore: usefulnessScore ?? undefined,
          timeSavedMinutes: typeof timeSavedMinutes === "number" ? timeSavedMinutes : undefined,
          comment: comment.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to submit feedback.");
      }

      setSuccessMsg(true);
      setTimeout(() => {
        setSuccessMsg(false);
        onClose();
        if (onFeedbackSubmitted) onFeedbackSubmitted();
      }, 1200);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg text-indigo-600 dark:text-indigo-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Pilot Validation Feedback
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {candidateName ? `Evaluation for candidate: ${candidateName}` : "General Requisition Feedback"}
              {systemScore !== undefined && ` (System Score: ${systemScore}/100)`}
            </p>
          </div>
        </div>

        {/* Non-destructive notice */}
        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <span className="font-semibold">Independent Calibration Record:</span> Feedback is stored separately from candidate match scores and hiring decisions. Submitting feedback will never alter the underlying deterministic score.
          </div>
        </div>

        {successMsg ? (
          <div className="my-8 py-8 flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 animate-bounce mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Feedback Recorded!</h3>
            <p className="text-xs text-slate-500 mt-1">Thank you for helping calibrate MatchLens AI.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Category selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Feedback Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PilotFeedbackCategory)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Structured Disagreement Reason */}
            {showDisagreementReason && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Primary Reason for Disagreement
                </label>
                <select
                  value={disagreementReason}
                  onChange={(e) => setDisagreementReason(e.target.value as PilotDisagreementReason)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select structured reason --</option>
                  {DISAGREEMENT_REASON_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Ratings Grid */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Trust in Explanation (1-5)
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setTrustScore(score)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition ${
                        trustScore === score
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Overall Usefulness (1-5)
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setUsefulnessScore(score)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition ${
                        usefulnessScore === score
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Time Saved */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Estimated Time Saved for this Candidate (Minutes)
              </label>
              <input
                type="number"
                min={0}
                max={120}
                value={timeSavedMinutes}
                onChange={(e) => setTimeSavedMinutes(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 15"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Comments with Privacy Disclaimer */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Optional Feedback Notes
                </label>
                <span className="text-[10px] text-slate-400">Do NOT paste candidate PII</span>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Explain the discrepancy or specific missing context without including personal contact details..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50 shadow-sm"
              >
                {isSubmitting ? "Recording..." : "Submit Pilot Feedback"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
