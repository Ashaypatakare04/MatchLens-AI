"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Sliders,
  Database,
  Info,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";

export default function SettingsPage() {
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const json = await res.json();
          setSystemInfo(json);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100 font-sans">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            System Settings &amp; Architecture
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Engine pipeline configurations, evaluation parameters, and model diagnostics
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* AI Engine Status */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Matching Engine Status
                </h3>
                <span className="text-xs text-emerald-600 font-semibold flex items-center space-x-1 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Hybrid Deterministic + NLP Pipeline Active</span>
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs border-t border-slate-100 dark:border-slate-800 pt-3">
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Active Provider:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {systemInfo?.status?.provider === "gemini" ? "Google Gemini 2.5 Flash" : "Hybrid Deterministic NLP (Zero Failure Risk)"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Fallback Strategy:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Instant Local Deterministic Engine
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Bonus Anomaly Detector:</span>
                <span className="font-semibold text-emerald-600">
                  ALG-AI-01 Active
                </span>
              </div>
            </div>
          </div>

          {/* Document Parser Specs */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Document Extraction Specs
                </h3>
                <span className="text-xs text-slate-500">
                  Pure JS / Edge Compatible Parsers
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs border-t border-slate-100 dark:border-slate-800 pt-3">
              <div className="flex justify-between py-1">
                <span className="text-slate-500">PDF Engine:</span>
                <span className="font-mono text-slate-900 dark:text-white">UnPDF (Canvas-free PDF.js)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">DOCX Engine:</span>
                <span className="font-mono text-slate-900 dark:text-white">Mammoth.js</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Duplicate Check:</span>
                <span className="font-mono text-slate-900 dark:text-white">SHA-256 Cryptographic Hash</span>
              </div>
            </div>
          </div>
        </div>

        {/* Evaluation Weights Defaults */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              System Default Weights Distribution
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            These default weights are configured globally and can be dynamically overridden per-job by any recruiter.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500">Required Skills</span>
              <div className="text-lg font-bold font-mono text-indigo-600 mt-1">35%</div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500">Experience Timeline</span>
              <div className="text-lg font-bold font-mono text-indigo-600 mt-1">25%</div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500">Job Responsibilities</span>
              <div className="text-lg font-bold font-mono text-indigo-600 mt-1">15%</div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500">Relevant Projects</span>
              <div className="text-lg font-bold font-mono text-indigo-600 mt-1">15%</div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500">Education &amp; Degree</span>
              <div className="text-lg font-bold font-mono text-indigo-600 mt-1">10%</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
