"use client";

import { PotentialInconsistency, InconsistencyType } from "@/lib/types";
import { AlertTriangle, Clock, HelpCircle, Calendar, ShieldCheck } from "lucide-react";

interface InconsistencyCardProps {
  inconsistency: PotentialInconsistency;
}

function renderInconsistencyIcon(type: InconsistencyType, className: string) {
  switch (type) {
    case "contradictory_dates":
      return <Calendar className={className} />;
    case "experience_mismatch":
      return <Clock className={className} />;
    case "unsupported_claim":
      return <HelpCircle className={className} />;
    default:
      return <AlertTriangle className={className} />;
  }
}

export function InconsistencyCard({ inconsistency }: InconsistencyCardProps) {
  const isHigh = inconsistency.severity === "high";

  return (
    <div
      className={`rounded-lg border p-4 transition ${
        isHigh
          ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800"
          : "bg-slate-50 dark:bg-slate-900 border-amber-200 dark:border-slate-800"
      }`}
    >
      <div className="flex items-start space-x-3">
        <div
          className={`p-2 rounded-md ${
            isHigh
              ? "bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200"
              : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400"
          }`}
        >
          {renderInconsistencyIcon(inconsistency.type, "w-5 h-5 flex-shrink-0")}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                {inconsistency.flag}
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isHigh
                    ? "bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200"
                    : "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                Potential Inconsistency • Requires Verification
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Integrity Verification Guard
            </span>
          </div>

          <div className="bg-white/80 dark:bg-slate-950/60 rounded border border-amber-200/60 dark:border-slate-800 p-2.5 text-xs text-slate-700 dark:text-slate-300 space-y-1">
            <div>
              <span className="font-semibold text-slate-900 dark:text-white">Detected Claim: </span>
              <span className="italic">{inconsistency.claim}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-900 dark:text-white">Timeline / Evidence: </span>
              <span>{inconsistency.evidence}</span>
            </div>
          </div>

          <div className="flex items-start space-x-1.5 text-xs text-indigo-700 dark:text-indigo-300 font-medium">
            <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Recruiter Guidance: {inconsistency.recommendation}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
