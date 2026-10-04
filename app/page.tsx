import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  FileText,
  Sliders,
  AlertTriangle,
  Award,
  ChevronRight,
  Cpu,
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
              <Sparkles className="w-3.5 h-3.5" />
              <span>ALGOTHON’26 — ALG-AI-01 Production AI Track</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              Find the right candidate without{" "}
              <span className="text-indigo-600 dark:text-indigo-400">
                drowning in resumes.
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed font-normal max-w-2xl">
              AI-powered resume matching that ranks candidates, explains every match with grounded resume citations, and flags claims that need human verification.
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
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-sm transition border border-slate-200 dark:border-slate-700"
              >
                <span>Recruiter Dashboard</span>
              </Link>
            </div>

            <div className="pt-4 flex items-center justify-center space-x-6 text-xs text-slate-500 font-medium">
              <span className="flex items-center space-x-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>Deterministic Scoring Engine</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>Evidence-Backed Citations</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>Contradiction Detection</span>
              </span>
            </div>
          </div>

          {/* Interactive Mini Product Preview */}
          <div className="mt-14 max-w-5xl mx-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="font-semibold text-slate-700 dark:text-slate-300 ml-2">
                  Live Recruiter Pipeline Preview
                </span>
              </div>
              <span className="font-mono text-slate-500 text-[11px]">
                Role: Senior Full-Stack & Cloud Platform Engineer
              </span>
            </div>

            {/* Workflow steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              {/* Step 1: Job Spec */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                    Step 1 • Requirements
                  </span>
                  <FileText className="w-4 h-4 text-slate-400" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Extracted Job Criteria
                </h4>
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex flex-wrap gap-1">
                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded text-[11px] font-medium">React</span>
                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded text-[11px] font-medium">TypeScript</span>
                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded text-[11px] font-medium">Node.js</span>
                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded text-[11px] font-medium">PostgreSQL</span>
                  </div>
                  <p className="text-[11px] text-slate-500 pt-1">
                    Required: 5+ yrs experience • CS Degree
                  </p>
                </div>
              </div>

              {/* Step 2: Analysis & Contradictions */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
                    Step 2 • Evidence & Flags
                  </span>
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  ALG-AI-01 Anomaly Scan
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 rounded text-emerald-800 dark:text-emerald-300 text-[11px]">
                    ✓ 5/5 Required skills verified with citations
                  </div>
                  <div className="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 rounded text-amber-800 dark:text-amber-300 text-[11px]">
                    ⚠ Flagged: Timeline overlap in candidate history
                  </div>
                </div>
              </div>

              {/* Step 3: Ranked Shortlist */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                    Step 3 • Decision Hub
                  </span>
                  <Award className="w-4 h-4 text-emerald-500" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Ranked Candidates
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between p-1.5 bg-slate-50 dark:bg-slate-800 rounded">
                    <span className="font-semibold text-slate-900 dark:text-white">1. Alex Rivera</span>
                    <span className="font-bold text-emerald-600 font-mono">94 / 100</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-slate-50 dark:bg-slate-800 rounded">
                    <span className="font-semibold text-slate-900 dark:text-white">2. Elena Rostova</span>
                    <span className="font-bold text-emerald-600 font-mono">87 / 100</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-slate-50 dark:bg-slate-800 rounded">
                    <span className="font-semibold text-slate-900 dark:text-white">3. David Chen</span>
                    <span className="font-bold text-blue-600 font-mono">77 / 100</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-16 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Turn hundreds of resumes into an evidence-backed shortlist
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Built specifically for technical hiring workflows. No black boxes, no arbitrary percentages, and no keyword spam susceptibility.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center font-bold">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Grounded Citations Layer
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Every score component links directly to exact resume snippets. Know precisely where skills, project impacts, and tenure were derived.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                ALG-AI-01 Bonus: Inconsistency Detection
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Detects unsupported skill claims (e.g. claiming &quot;Kubernetes Architect&quot; with zero projects), overlapping employment dates, and timeline mismatches.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Configurable Transparent Weights
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Customize relative weights for Skills, Experience, Responsibilities, Projects, and Education. Scores recompute dynamically in real-time.
              </p>
            </div>
          </div>

          {/* Quick Flow CTA */}
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Ready to test the live candidate pipeline?</h3>
              <p className="text-xs sm:text-sm text-indigo-200 max-w-xl">
                Experience the end-to-end recruiter workflow with pre-seeded messy resumes, contradictory dates, and transferable skills.
              </p>
            </div>
            <Link
              href="/jobs/job-cloudscale-sr-fullstack/candidates"
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-lg bg-white text-indigo-950 font-bold text-sm hover:bg-indigo-50 transition flex-shrink-0"
            >
              <span>Explore Candidate Shortlist</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 py-6 bg-white dark:bg-slate-900 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            MatchLens-AI • ALGOTHON’26 Hackathon (ALG-AI-01: AI Resume &amp; Job Matching System)
          </p>
          <div className="flex items-center space-x-4">
            <Link href="/test-suite" className="hover:underline">
              12 Edge Cases Test Suite
            </Link>
            <Link href="/settings" className="hover:underline">
              System Settings
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
