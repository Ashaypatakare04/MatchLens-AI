"use client";

import { useState } from "react";
import { ScoringWeights } from "@/lib/types";
import { Sliders, Check, RotateCcw, X } from "lucide-react";
import { DEFAULT_WEIGHTS } from "@/lib/extractor/job-extractor";

interface WeightsModalProps {
  jobId: string;
  initialWeights: ScoringWeights;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function WeightsModal({
  jobId,
  initialWeights,
  isOpen,
  onClose,
  onUpdated,
}: WeightsModalProps) {
  const [weights, setWeights] = useState<ScoringWeights>({ ...initialWeights });
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const total =
    weights.skills +
    weights.experience +
    weights.education +
    weights.projects +
    weights.responsibilities;

  const handleSliderChange = (key: keyof ScoringWeights, val: number) => {
    setWeights((prev) => ({ ...prev, [key]: val }));
  };

  const handleReset = () => {
    setWeights({ ...DEFAULT_WEIGHTS });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/rescore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weights }),
      });
      if (res.ok) {
        onUpdated();
        onClose();
      }
    } catch (err) {
      console.error("Failed to update weights:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const sliders = [
    { key: "skills" as const, label: "Required & Preferred Skills", desc: "Syntactic and semantic skill matches" },
    { key: "experience" as const, label: "Years of Experience", desc: "Non-overlapping verified timeline tenure" },
    { key: "responsibilities" as const, label: "Job Responsibilities", desc: "Alignment with core role duties and daily tasks" },
    { key: "projects" as const, label: "Relevant Projects", desc: "Demonstrated production repositories & applications" },
    { key: "education" as const, label: "Education & Degree", desc: "Degree relevance and educational qualification" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 rounded-lg">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Customize Scoring Formula
              </h3>
              <p className="text-xs text-slate-500">
                Configure evaluation weights to mirror your hiring priorities
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {sliders.map((s) => (
            <div key={s.key} className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {s.label}
                  </span>
                  <p className="text-[11px] text-slate-500">{s.desc}</p>
                </div>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm ml-4">
                  {weights[s.key]}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                step="5"
                value={weights[s.key]}
                onChange={(e) => handleSliderChange(s.key, parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-800 rounded-lg"
              />
            </div>
          ))}

          <div className="pt-2 flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
            <span className="font-medium text-slate-600 dark:text-slate-400">Total Sum of Weights:</span>
            <span
              className={`font-mono font-bold ${
                total === 100
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {total}% {total !== 100 && "(Automatically normalized to 100% on calculation)"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleReset}
            className="flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? "Recalculating..." : "Apply & Recalculate"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
