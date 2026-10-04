"use client";

import { getScoreBadgeColor } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function ScoreBadge({ score, size = "md", showLabel = false }: ScoreBadgeProps) {
  const badgeStyle = getScoreBadgeColor(score);

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs font-semibold",
    md: "px-2.5 py-1 text-sm font-bold",
    lg: "px-3.5 py-1.5 text-base font-extrabold",
  };

  return (
    <div className="inline-flex items-center space-x-1.5">
      <span
        className={`inline-flex items-center justify-center rounded-md border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border} ${sizeClasses[size]}`}
      >
        <span>{Math.round(score)}</span>
        <span className="text-[10px] font-normal opacity-70 ml-0.5">/100</span>
      </span>
      {showLabel && (
        <span className={`text-xs font-medium ${badgeStyle.text}`}>
          {badgeStyle.label}
        </span>
      )}
    </div>
  );
}
