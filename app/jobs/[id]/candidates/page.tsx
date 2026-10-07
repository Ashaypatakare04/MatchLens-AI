"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Table as TableIcon,
  LayoutGrid,
  Scale,
  Sparkles,
  ChevronRight,
  FileText,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { ScoreBadge } from "@/components/ScoreBadge";
import { WeightsModal } from "@/components/WeightsModal";
import { Job, CandidateProfile, MatchAnalysis, ScoringWeights } from "@/lib/types";
import { DEFAULT_WEIGHTS } from "@/lib/extractor/job-extractor";

interface CandidatePair {
  candidate: CandidateProfile;
  match: MatchAnalysis;
}

export default function CandidateRankingPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = (params.id as string) || "job-cloudscale-sr-fullstack";

  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<CandidatePair[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [minScoreFilter, setMinScoreFilter] = useState("all");
  const [recommendationFilter, setRecommendationFilter] = useState("all");
  const [warningFilter, setWarningFilter] = useState("all");
  const [decisionFilter, setDecisionFilter] = useState("all");
  const [selectedSkillFilter, setSelectedSkillFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"overallScore" | "skills" | "experience" | "education" | "name">("overallScore");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // View mode
  const [viewMode, setViewMode] = useState<"table" | "card">("table");

  // Comparison selection
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  // Weights modal state
  const [isWeightsOpen, setIsWeightsOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const jobRes = await fetch(`/api/jobs/${jobId}`);
      if (jobRes.ok) {
        const jobJson = await jobRes.json();
        setJob(jobJson.job);
      }

      const candRes = await fetch(`/api/jobs/${jobId}/candidates`);
      if (candRes.ok) {
        const candJson = await candRes.json();
        setCandidates(candJson.candidates || []);
      }
    } catch (err) {
      console.error("Failed to load candidate ranking:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [jobId]);

  // Handle Quick Decision Toggle directly from list
  const handleQuickDecision = async (candidateId: string, decision: "shortlisted" | "rejected" | "maybe" | "unreviewed") => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/candidates/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (res.ok) {
        setCandidates((prev) =>
          prev.map((item) =>
            item.candidate.id === candidateId
              ? { ...item, match: { ...item.match, recruiterDecision: decision } }
              : item
          )
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle comparison selection (max 4)
  const toggleCompare = (candidateId: string) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(candidateId)) {
        return prev.filter((id) => id !== candidateId);
      }
      if (prev.length >= 4) {
        alert("You can select up to 4 candidates to compare side-by-side.");
        return prev;
      }
      return [...prev, candidateId];
    });
  };

  // Filtered & Sorted candidates
  const filteredCandidates = useMemo(() => {
    return candidates
      .filter(({ candidate, match }) => {
        // Search
        if (search) {
          const s = search.toLowerCase();
          const matchesSearch =
            candidate.name.toLowerCase().includes(s) ||
            candidate.email.toLowerCase().includes(s) ||
            candidate.skills.some((sk) => sk.toLowerCase().includes(s)) ||
            candidate.workHistory.some((w) => w.company.toLowerCase().includes(s));
          if (!matchesSearch) return false;
        }

        // Min Score
        if (minScoreFilter !== "all") {
          const min = parseInt(minScoreFilter, 10);
          if (match.overallScore < min) return false;
        }

        // Recommendation
        if (recommendationFilter !== "all") {
          if (match.aiRecommendation !== recommendationFilter) return false;
        }

        // Warnings
        if (warningFilter === "has_warnings") {
          if (match.potentialInconsistencies.length === 0) return false;
        } else if (warningFilter === "clean") {
          if (match.potentialInconsistencies.length > 0) return false;
        }

        // Recruiter Decision
        if (decisionFilter !== "all") {
          if (match.recruiterDecision !== decisionFilter) return false;
        }

        // Skill
        if (selectedSkillFilter !== "all") {
          const hasSkill = match.skillsAnalysis.requiredMatched.some(
            (m) => m.targetSkill.toLowerCase() === selectedSkillFilter.toLowerCase()
          );
          if (!hasSkill) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA: number | string = 0;
        let valB: number | string = 0;

        switch (sortBy) {
          case "skills":
            valA = a.match.scoreBreakdown.skills;
            valB = b.match.scoreBreakdown.skills;
            break;
          case "experience":
            valA = a.match.scoreBreakdown.experience;
            valB = b.match.scoreBreakdown.experience;
            break;
          case "education":
            valA = a.match.scoreBreakdown.education;
            valB = b.match.scoreBreakdown.education;
            break;
          case "name":
            valA = a.candidate.name;
            valB = b.candidate.name;
            break;
          case "overallScore":
          default:
            valA = a.match.overallScore;
            valB = b.match.overallScore;
            break;
        }

        if (typeof valA === "string" && typeof valB === "string") {
          return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }

        return sortOrder === "asc"
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      });
  }, [
    candidates,
    search,
    minScoreFilter,
    recommendationFilter,
    warningFilter,
    decisionFilter,
    selectedSkillFilter,
    sortBy,
    sortOrder,
  ]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Job Header & Context */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-xs">
                <span className="font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded">
                  {job?.company || "CloudScale Technologies"}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500">{job?.workMode || "Hybrid"}</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500">{job?.location}</span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {job?.title || "Senior Full-Stack & Cloud Platform Engineer"}
              </h1>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsWeightsOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                <span>Adjust Weights</span>
              </button>

              <Link
                href={`/jobs/${jobId}/upload`}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
              >
                <span>+ Upload Resumes</span>
              </Link>
            </div>
          </div>

          {/* Active Requirements Bar */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="font-semibold text-slate-500">Required:</span>
              {job?.requirements.requiredSkills.map((s) => (
                <span
                  key={s}
                  className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold border border-indigo-100 dark:border-indigo-900"
                >
                  {s}
                </span>
              ))}
              <span className="text-slate-400 ml-2">({job?.requirements.minExperienceYears}+ yrs exp)</span>
            </div>

            <div className="text-slate-500 font-mono text-[11px]">
              Weights: Skills {job?.weights?.skills}% • Exp {job?.weights?.experience}% • Resp{" "}
              {job?.weights?.responsibilities}% • Proj {job?.weights?.projects}% • Edu{" "}
              {job?.weights?.education}%
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search candidates by name, skill, or company..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Score Filter */}
              <select
                value={minScoreFilter}
                onChange={(e) => setMinScoreFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300"
              >
                <option value="all">All Scores</option>
                <option value="85">85+ (Strong Match)</option>
                <option value="70">70+ (Good Match)</option>
                <option value="50">50+ (Moderate)</option>
              </select>

              {/* Recommendation Filter */}
              <select
                value={recommendationFilter}
                onChange={(e) => setRecommendationFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300"
              >
                <option value="all">All Recommendations</option>
                <option value="Strong Match">Strong Match</option>
                <option value="Consider">Consider</option>
                <option value="Review Required">Review Required</option>
                <option value="Low Alignment">Low Alignment</option>
              </select>

              {/* Warning Filter */}
              <select
                value={warningFilter}
                onChange={(e) => setWarningFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300"
              >
                <option value="all">All Inconsistency States</option>
                <option value="has_warnings">⚠ Flagged Inconsistencies</option>
                <option value="clean">✓ Verified / Clean</option>
              </select>

              {/* Decision Filter */}
              <select
                value={decisionFilter}
                onChange={(e) => setDecisionFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300"
              >
                <option value="all">All Recruiter Decisions</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="maybe">Maybe</option>
                <option value="rejected">Rejected</option>
                <option value="unreviewed">Unreviewed</option>
              </select>

              {/* Sort selector */}
              <div className="flex items-center space-x-1 pl-2 border-l border-slate-200 dark:border-slate-700">
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(
                      e.target.value as "overallScore" | "skills" | "experience" | "education" | "name"
                    )
                  }
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  <option value="overallScore">Sort: Overall Match</option>
                  <option value="skills">Sort: Skills Match</option>
                  <option value="experience">Sort: Experience</option>
                  <option value="education">Sort: Education</option>
                  <option value="name">Sort: Candidate Name</option>
                </select>

                <button
                  onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                  className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                  title="Toggle Ascending / Descending"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* View mode toggle */}
              <div className="flex items-center space-x-0.5 rounded border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-950">
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-1 rounded ${
                    viewMode === "table"
                      ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-xs"
                      : "text-slate-400"
                  }`}
                  title="Table View"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("card")}
                  className={`p-1 rounded ${
                    viewMode === "card"
                      ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-xs"
                      : "text-slate-400"
                  }`}
                  title="Card View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Floating Sticky Bar */}
        {selectedForCompare.length > 0 && (
          <div className="sticky top-20 z-40 bg-indigo-900 text-white p-3 rounded-xl shadow-xl flex items-center justify-between border border-indigo-700">
            <div className="flex items-center space-x-2 text-xs font-semibold">
              <Scale className="w-4 h-4 text-indigo-300" />
              <span>
                {selectedForCompare.length} candidate(s) selected for side-by-side comparison (max 4)
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSelectedForCompare([])}
                className="px-2.5 py-1 text-xs text-indigo-200 hover:text-white"
              >
                Clear
              </button>
              <Link
                href={`/jobs/${jobId}/compare?ids=${selectedForCompare.join(",")}`}
                className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-white text-indigo-950 hover:bg-indigo-50 rounded-lg text-xs font-bold transition shadow-sm"
              >
                <span>Compare Selected Candidates</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Candidate List (Table or Card) */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Evaluating candidates against job requirements...
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
            <Users className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              No matching candidates found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search criteria, score thresholds, or filters.
            </p>
          </div>
        ) : viewMode === "table" ? (
          /* Table View */
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3 w-8">
                      <span className="sr-only">Compare</span>
                    </th>
                    <th className="p-3 w-12 text-center">Rank</th>
                    <th className="p-3">Candidate</th>
                    <th className="p-3 text-center">Match Score</th>
                    <th className="p-3">Skills / Exp / Edu</th>
                    <th className="p-3">Strong Points &amp; Missing</th>
                    <th className="p-3">Flags</th>
                    <th className="p-3">Decision</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredCandidates.map(({ candidate, match }, index) => {
                    const isSelected = selectedForCompare.includes(candidate.id);
                    const hasFlags = match.potentialInconsistencies.length > 0;

                    return (
                      <tr
                        key={candidate.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${
                          isSelected ? "bg-indigo-50/40 dark:bg-indigo-950/20" : ""
                        }`}
                      >
                        {/* Checkbox for comparison */}
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleCompare(candidate.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            title="Select for comparison"
                          />
                        </td>

                        {/* Rank */}
                        <td className="p-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                          #{index + 1}
                        </td>

                        {/* Candidate Name & Info */}
                        <td className="p-3 min-w-[180px]">
                          <div>
                            <Link
                              href={`/jobs/${jobId}/candidates/${candidate.id}`}
                              className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 text-sm"
                            >
                              {candidate.name}
                            </Link>
                            <div className="flex items-center space-x-1.5 mt-0.5">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide ${
                                match.skillsAnalysis?.transferableSkills?.length > 0 && match.skillsAnalysis?.requiredMissing?.length > 0
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200"
                                  : match.overallScore >= 80 && match.skillsAnalysis?.requiredMissing?.length === 0
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200"
                                  : match.overallScore >= 50
                                  ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                  : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              }`}>
                                {match.skillsAnalysis?.transferableSkills?.length > 0 && match.skillsAnalysis?.requiredMissing?.length > 0
                                  ? "Transferable Match"
                                  : match.overallScore >= 80 && match.skillsAnalysis?.requiredMissing?.length === 0
                                  ? "Direct Match"
                                  : match.overallScore >= 50
                                  ? "Partial Match"
                                  : "Low Alignment"}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1">
                              {candidate.location} • Total: {candidate.totalExperienceYears} yrs | Relevant: <strong className="text-slate-800 dark:text-slate-200">{match.relevantExperienceYears ?? match.experienceAnalysis?.relevantExperienceYears ?? candidate.totalExperienceYears} yrs</strong>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                              {candidate.email}
                            </div>
                          </div>
                        </td>

                        {/* Match Score */}
                        <td className="p-3 text-center">
                          <ScoreBadge score={match.overallScore} size="md" />
                          <div className="text-[10px] text-slate-500 mt-1 font-medium">
                            {match.aiRecommendation}
                          </div>
                        </td>

                        {/* Breakdown pills */}
                        <td className="p-3 min-w-[140px]">
                          <div className="space-y-1 text-[11px]">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Skills:</span>
                              <span className="font-mono font-semibold">{match.scoreBreakdown.skills}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Exp:</span>
                              <span className="font-mono font-semibold">{match.scoreBreakdown.experience}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Edu:</span>
                              <span className="font-mono font-semibold">{match.scoreBreakdown.education}%</span>
                            </div>
                          </div>
                        </td>

                        {/* Strong Matches & Missing */}
                        <td className="p-3 max-w-[260px]">
                          <div className="space-y-1 text-[11px]">
                            {match.strongMatches[0] && (
                              <div className="text-emerald-700 dark:text-emerald-300 line-clamp-1">
                                ✓ {match.strongMatches[0]}
                              </div>
                            )}
                            {match.missingRequirements[0] && (
                              <div className="text-rose-600 dark:text-rose-400 line-clamp-1">
                                ⚠ {match.missingRequirements[0]}
                              </div>
                            )}
                            {match.skillsAnalysis.transferableSkills[0] && (
                              <div className="text-blue-600 dark:text-blue-400 line-clamp-1">
                                ⇄ Transferable: {match.skillsAnalysis.transferableSkills[0].candidateSkill} → {match.skillsAnalysis.transferableSkills[0].targetSkill}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Inconsistency Flags */}
                        <td className="p-3 min-w-[130px]">
                          {hasFlags ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>{match.potentialInconsistencies[0].flag}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-[10px] font-medium text-emerald-600">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>No anomalies</span>
                            </span>
                          )}
                        </td>

                        {/* Recruiter Decision Pill / Toggle */}
                        <td className="p-3">
                          <select
                            value={match.recruiterDecision}
                            onChange={(e) =>
                              handleQuickDecision(
                                candidate.id,
                                e.target.value as "shortlisted" | "rejected" | "maybe" | "unreviewed"
                              )
                            }
                            className={`px-2 py-1 rounded text-[11px] font-semibold border cursor-pointer ${
                              match.recruiterDecision === "shortlisted"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200"
                                : match.recruiterDecision === "rejected"
                                ? "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200"
                                : match.recruiterDecision === "maybe"
                                ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200"
                                : "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            <option value="unreviewed">Unreviewed</option>
                            <option value="shortlisted">Shortlisted</option>
                            <option value="maybe">Maybe</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-right">
                          <Link
                            href={`/jobs/${jobId}/candidates/${candidate.id}`}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 hover:text-indigo-600 dark:text-slate-200 text-xs font-semibold transition"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Card View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCandidates.map(({ candidate, match }, index) => {
              const isSelected = selectedForCompare.includes(candidate.id);
              const hasFlags = match.potentialInconsistencies.length > 0;

              return (
                <div
                  key={candidate.id}
                  className={`bg-white dark:bg-slate-900 rounded-xl border p-5 shadow-sm transition space-y-4 ${
                    isSelected
                      ? "border-indigo-500 ring-2 ring-indigo-500/20"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs font-bold font-mono">
                        #{index + 1}
                      </span>
                      <div>
                        <Link
                          href={`/jobs/${jobId}/candidates/${candidate.id}`}
                          className="font-bold text-sm text-slate-900 dark:text-white hover:text-indigo-600"
                        >
                          {candidate.name}
                        </Link>
                        <p className="text-[11px] text-slate-500">
                          {candidate.location} • Total: {candidate.totalExperienceYears} yrs | Relevant: <strong>{match.relevantExperienceYears ?? match.experienceAnalysis?.relevantExperienceYears ?? candidate.totalExperienceYears} yrs</strong>
                        </p>
                        <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 ${
                          match.skillsAnalysis?.transferableSkills?.length > 0 && match.skillsAnalysis?.requiredMissing?.length > 0
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200"
                            : match.overallScore >= 80 && match.skillsAnalysis?.requiredMissing?.length === 0
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200"
                            : match.overallScore >= 50
                            ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        }`}>
                          {match.skillsAnalysis?.transferableSkills?.length > 0 && match.skillsAnalysis?.requiredMissing?.length > 0
                            ? "Transferable Match"
                            : match.overallScore >= 80 && match.skillsAnalysis?.requiredMissing?.length === 0
                            ? "Direct Match"
                            : match.overallScore >= 50
                            ? "Partial Match"
                            : "Low Alignment"}
                        </span>
                      </div>
                    </div>
                    <ScoreBadge score={match.overallScore} size="sm" />
                  </div>

                  {/* Score Breakdown Bar */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-2 text-center text-[10px]">
                    <div>
                      <span className="text-slate-500">Skills</span>
                      <div className="font-mono font-bold text-slate-900 dark:text-white">
                        {match.scoreBreakdown.skills}%
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Experience</span>
                      <div className="font-mono font-bold text-slate-900 dark:text-white">
                        {match.scoreBreakdown.experience}%
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Education</span>
                      <div className="font-mono font-bold text-slate-900 dark:text-white">
                        {match.scoreBreakdown.education}%
                      </div>
                    </div>
                  </div>

                  {/* Highlights */}
                  <div className="space-y-1.5 text-xs">
                    {match.strongMatches[0] && (
                      <p className="text-emerald-700 dark:text-emerald-300 text-[11px] line-clamp-1">
                        ✓ {match.strongMatches[0]}
                      </p>
                    )}
                    {match.missingRequirements[0] && (
                      <p className="text-rose-600 dark:text-rose-400 text-[11px] line-clamp-1">
                        ⚠ {match.missingRequirements[0]}
                      </p>
                    )}
                    {hasFlags && (
                      <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/50 border border-amber-200 text-amber-800 dark:text-amber-200 text-[10px]">
                        ⚠ {match.potentialInconsistencies[0].flag}
                      </div>
                    )}
                  </div>

                  {/* Actions & Compare Checkbox */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <label className="flex items-center space-x-1.5 cursor-pointer text-slate-600">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleCompare(candidate.id)}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span className="text-[11px]">Compare</span>
                    </label>

                    <Link
                      href={`/jobs/${jobId}/candidates/${candidate.id}`}
                      className="text-indigo-600 font-semibold hover:underline inline-flex items-center space-x-1"
                    >
                      <span>Inspect Candidate</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Weights Modal */}
        {job && (
          <WeightsModal
            jobId={jobId}
            initialWeights={job.weights || DEFAULT_WEIGHTS}
            isOpen={isWeightsOpen}
            onClose={() => setIsWeightsOpen(false)}
            onUpdated={fetchData}
          />
        )}
      </main>
    </div>
  );
}
