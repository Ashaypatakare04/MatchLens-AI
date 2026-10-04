"use client";

import { useState, useEffect } from "react";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Play,
  RefreshCw,
  Sparkles,
  Info,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { EdgeCaseTestCase } from "@/lib/types";

export default function TestSuitePage() {
  const [tests, setTests] = useState<EdgeCaseTestCase[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [totalPassed, setTotalPassed] = useState(0);

  const runTests = async () => {
    setIsRunning(true);
    try {
      const res = await fetch("/api/edge-cases/run", { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        setTests(json.tests || []);
        setTotalPassed(json.passed || 0);
      }
    } catch (err) {
      console.error("Test runner error:", err);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100 font-sans">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-indigo-600 font-semibold mb-1">
              <ShieldAlert className="w-4 h-4" />
              <span>ALGOTHON’26 Evaluation &amp; Robustness Verification</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Edge Cases &amp; Reliability Suite
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              12 automated test cases verifying system resilience against messy formatting, zero-byte files, duplicate uploads, scanned resumes, and contradictory claims.
            </p>
          </div>

          <button
            onClick={runTests}
            disabled={isRunning}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRunning ? "animate-spin" : ""}`} />
            <span>{isRunning ? "Running Suite..." : "Re-Run All 12 Tests"}</span>
          </button>
        </div>

        {/* Results Banner */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                {totalPassed} / {tests.length || 12} Edge Case Tests Passing
              </div>
              <p className="text-xs text-slate-500">
                Automated validation across 12 document format, anomaly &amp; reliability scenarios
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="px-3 py-1 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-bold">
              PASS: {totalPassed}
            </span>
            <span className="px-3 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              FAIL: {tests.length - totalPassed}
            </span>
          </div>
        </div>

        {/* Test Cards List */}
        <div className="space-y-4">
          {tests.map((tc) => {
            const passed = tc.result?.passed ?? true;

            return (
              <div
                key={tc.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {tc.name}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {tc.testType}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      <strong>Scenario:</strong> {tc.scenario}
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
                      passed
                        ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        : "bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                    }`}
                  >
                    {passed ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>PASSED</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>FAILED</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 rounded-lg p-3 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Expected Behavior:{" "}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {tc.expectedBehavior}
                    </span>
                  </div>

                  {tc.result && (
                    <div className="pt-1 border-t border-slate-200 dark:border-slate-800/60">
                      <span className="font-semibold text-indigo-700 dark:text-indigo-400">
                        Execution Result:{" "}
                      </span>
                      <span className="text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                        {tc.result.details}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
