import Link from "next/link";
import {
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  FileText,
  Sliders,
  AlertTriangle,
  Award,
  ChevronRight,
  Cpu,
  Layers,
  Search,
  Check,
  Scale,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100 font-sans">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              <span>ALGOTHON’26 — ALG-AI-01: AI Resume &amp; Job Matching System</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              Evidence-backed candidate matching
            </h1>

            <p className="text-lg sm:text-xl text-slate-700 dark:text-slate-200 leading-relaxed font-medium max-w-2xl">
              Match resumes to real job requirements, understand why candidates rank highly, and flag claims that require verification.
            </p>

            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl">
              Analyze resumes against job requirements, understand why candidates match, and identify claims that require verification.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 w-full sm:w-auto">
              <Link
                href="/jobs/job-cloudscale-sr-fullstack/candidates"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm transition"
              >
                <span>Analyze Candidates</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/jobs/job-cloudscale-sr-fullstack/candidates"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-sm transition border border-slate-200 dark:border-slate-700"
              >
                <span>Explore Demo</span>
              </Link>
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <span className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Deterministic Scoring Layer</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Resume-Grounded Evidence</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Potential Inconsistency Flags</span>
              </span>
            </div>
          </div>

          {/* Realistic Product Preview: Job Spec -> Analysis -> Ranked -> Evidence -> Flags */}
          <div className="mt-14 max-w-5xl mx-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 text-xs gap-2">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 inline-block" />
                <span className="font-semibold text-slate-800 dark:text-slate-200 ml-2">
                  MatchLens Recruiter Intelligence Pipeline
                </span>
              </div>
              <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-mono">
                <span>Job: Senior Full-Stack &amp; Cloud Platform Engineer</span>
              </div>
            </div>

            {/* 5-Stage Live Preview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-1">
              {/* 1. Job Requirements */}
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                  1. Requirements
                </span>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Job Criteria
                </h4>
                <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                  <div className="flex flex-wrap gap-1">
                    <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-semibold">React</span>
                    <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-semibold">Node.js</span>
                    <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-semibold">Postgres</span>
                  </div>
                  <p className="text-[10px] text-slate-500 pt-0.5">5+ yrs exp • CS degree</p>
                </div>
              </div>

              {/* 2. Candidate Analysis */}
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
                  2. Analysis
                </span>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Resume Intake
                </h4>
                <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                  <p className="text-[10px] text-slate-500">PDF, DOCX &amp; TXT</p>
                  <p className="text-[10px] font-mono text-slate-700 dark:text-slate-300">10 resumes parsed</p>
                  <span className="inline-block px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded text-[10px] font-medium">
                    Timeline verified
                  </span>
                </div>
              </div>

              {/* 3. Ranked Candidates */}
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                  3. Ranked Shortlist
                </span>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Matching Scores
                </h4>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">1. Alex R.</span>
                    <span className="font-mono font-bold text-emerald-600">94/100</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">2. Elena R.</span>
                    <span className="font-mono font-bold text-emerald-600">87/100</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">3. David C.</span>
                    <span className="font-mono font-bold text-blue-600">77/100</span>
                  </div>
                </div>
              </div>

              {/* 4. Evidence */}
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                  4. Grounded Evidence
                </span>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Skill Citations
                </h4>
                <div className="space-y-1 text-[10px]">
                  <div className="text-emerald-700 dark:text-emerald-300">✓ React — Strong evidence</div>
                  <div className="text-emerald-700 dark:text-emerald-300">✓ Node.js — Strong evidence</div>
                  <div className="text-blue-700 dark:text-blue-300">✓ AWS — Moderate evidence</div>
                  <div className="text-amber-700 dark:text-amber-300">⚠ K8s — Limited evidence</div>
                </div>
              </div>

              {/* 5. Verification Flags */}
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-amber-200 dark:border-amber-900/60 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                  5. Inconsistency Flags
                </span>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Recruiter Alerts
                </h4>
                <div className="space-y-1 text-[10px] text-amber-800 dark:text-amber-300">
                  <div>⚠ Unsupported skill claim</div>
                  <div>⚠ Possible overlap dates</div>
                  <div>⚠ Experience verification</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Clear Hybrid Architecture Section */}
      <section className="py-16 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Hybrid AI + Deterministic Matching Architecture
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              MatchLens avoids black-box scoring. Scores are never arbitrarily decided by an LLM; instead, structured AI extraction feeds a strictly verifiable, deterministic scoring and verification pipeline.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AI / Semantic Layer */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-indigo-200 dark:border-indigo-900/60 shadow-sm space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    AI &amp; Semantic Intelligence Layer
                  </h3>
                  <p className="text-[11px] text-slate-500">Language understanding &amp; normalization</p>
                </div>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                <li className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Structured Requirement Extraction:</strong> Identifies essential vs preferred skills and role requirements from unstructured job descriptions.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Resume Understanding:</strong> Extracts candidate history across non-standard headers and messy document formats.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Semantic Relevance &amp; Taxonomy:</strong> Maps equivalents (&quot;React.js&quot; $\to$ &quot;React&quot;) and transferable skills (Angular $\to$ React).</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Grounded Explanation Generation:</strong> Produces concise executive summaries anchored directly in verified facts.</span>
                </li>
              </ul>
            </div>

            {/* Deterministic Layer */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Deterministic Computation Layer
                  </h3>
                  <p className="text-[11px] text-slate-500">Verifiable math &amp; rule-based validation</p>
                </div>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                <li className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Configurable Weighted Scoring:</strong> Calculates matching scores deterministically using configured recruiter weights.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Chronological Timeline Engine:</strong> Calculates non-overlapping tenure and measures actual cumulative experience in years.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Date Overlap Detection:</strong> Mathematically detects overlapping calendar months across concurrent full-time roles.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Duplicate Prevention:</strong> Generates cryptographic SHA-256 hashes to prevent re-processing identical documents.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Core Differentiators Grid */}
      <section className="py-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Built for faster, more trustworthy hiring
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              MatchLens doesn&apos;t just rank candidates. It explains the evidence behind every match and flags claims that require verification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Evidence-Backed Matching
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Every matching score points directly to verified resume citations with source sections and evidence strength ratings (Strong, Moderate, Limited).
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Potential Inconsistency Detection
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Flags unsupported skill claims, overlapping employment tenures, and experience timeline discrepancies using neutral, objective verification guidance.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Transparent Configurable Weights
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Recruiters adjust weighting across Skills, Experience, Responsibilities, Projects, and Education. Scores recompute dynamically and deterministically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 bg-slate-50 dark:bg-slate-950 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            MatchLens AI • ALGOTHON’26 Hackathon (ALG-AI-01: AI Resume &amp; Job Matching System)
          </p>
          <div className="flex items-center space-x-6">
            <Link href="/dashboard" className="hover:underline">
              Recruiter Dashboard
            </Link>
            <Link href="/test-suite" className="hover:underline">
              Edge Cases &amp; Reliability Suite
            </Link>
            <Link href="/settings" className="hover:underline">
              Settings &amp; Architecture
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
