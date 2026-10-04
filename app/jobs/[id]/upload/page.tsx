"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Copy,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";

interface UploadedFileItem {
  file: File;
  name: string;
  size: number;
  status: "pending" | "processing" | "success" | "duplicate" | "error";
  step?: string;
  errorReason?: string;
  score?: number;
  candidateId?: string;
}

const PROCESSING_STEPS = [
  "Uploading document...",
  "Extracting text & structure...",
  "Normalizing skills & taxonomy...",
  "Analyzing job criteria...",
  "Running ALG-AI-01 inconsistency scan...",
  "Generating evidence-backed explanation...",
  "Finalizing match score...",
];

export default function ResumeUploadPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = (params.id as string) || "job-cloudscale-sr-fullstack";

  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const array = Array.from(newFiles);

    const items: UploadedFileItem[] = array.map((f) => ({
      file: f,
      name: f.name,
      size: f.size,
      status: "pending",
    }));

    setFiles((prev) => [...prev, ...items]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFilesSelected(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleStartProcessing = async () => {
    if (files.length === 0 || isProcessing) return;
    setIsProcessing(true);

    const formData = new FormData();
    files.forEach((item) => {
      formData.append("files", item.file);
    });

    // Step animation for realistic transparency
    let step = 0;
    const interval = setInterval(() => {
      step = (step + 1) % PROCESSING_STEPS.length;
      setCurrentStepIndex(step);
    }, 400);

    try {
      const res = await fetch(`/api/jobs/${jobId}/upload`, {
        method: "POST",
        body: formData,
      });

      clearInterval(interval);

      if (res.ok) {
        const json = await res.json();
        const results = json.results || [];

        setFiles((prev) =>
          prev.map((item) => {
            const match = results.find(
              (r: { fileName: string }) => r.fileName === item.name
            );
            if (!match) return { ...item, status: "error", errorReason: "Processing failed" };

            return {
              ...item,
              status: match.status,
              errorReason: match.errorReason,
              score: match.overallScore,
              candidateId: match.candidateId,
            };
          })
        );
      } else {
        const errorJson = await res.json();
        setFiles((prev) =>
          prev.map((item) => ({
            ...item,
            status: "error",
            errorReason: errorJson.error || "Server error occurred",
          }))
        );
      }
    } catch (err: unknown) {
      clearInterval(interval);
      const msg = err instanceof Error ? err.message : String(err);
      setFiles((prev) =>
        prev.map((item) => ({ ...item, status: "error", errorReason: msg }))
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSeedDemoSample = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/demo/seed", { method: "POST" });
      if (res.ok) {
        router.push(`/jobs/${jobId}/candidates`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const successCount = files.filter((f) => f.status === "success").length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <div className="flex items-center space-x-2 text-xs text-indigo-600 font-semibold mb-1">
            <UploadCloud className="w-4 h-4" />
            <span>Step 2 of Recruiter Workflow</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Upload &amp; Analyze Resumes
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Accepts multiple PDF, DOCX, and TXT files. The hybrid engine normalizes skills, parses messy layouts, detects inconsistencies, and calculates evidence-backed matching scores.
          </p>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition flex flex-col items-center justify-center space-y-4 ${
            isDragging
              ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30"
              : "border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900"
          }`}
        >
          <div className="w-14 h-14 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <UploadCloud className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Drag &amp; drop candidate resumes here
            </h3>
            <p className="text-xs text-slate-500">
              Supports <strong className="text-slate-700 dark:text-slate-300">PDF, DOCX, TXT</strong>. Multi-file upload supported. Duplicate resumes automatically detected by SHA-256 hash.
            </p>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition"
            >
              Select Files from Computer
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />

            <span className="text-xs text-slate-400">or</span>

            <button
              type="button"
              onClick={handleSeedDemoSample}
              disabled={isProcessing}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition"
              title="Instantly process the 10 pre-built hackathon candidates"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Load 10 Sample Candidates</span>
            </button>
          </div>
        </div>

        {/* Processing State Tracker */}
        {isProcessing && (
          <div className="bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 rounded-xl p-6 space-y-4 shadow-sm animate-pulse">
            <div className="flex items-center space-x-3">
              <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />
              <div className="flex-1">
                <h4 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
                  AI Processing in Progress...
                </h4>
                <p className="text-xs text-indigo-700 dark:text-indigo-400">
                  {PROCESSING_STEPS[currentStepIndex]}
                </p>
              </div>
            </div>

            <div className="w-full bg-indigo-200 dark:bg-indigo-900 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-2 transition-all duration-300"
                style={{
                  width: `${((currentStepIndex + 1) / PROCESSING_STEPS.length) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Files Queue List */}
        {files.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Uploaded Resumes ({files.length})
                </h3>
              </div>

              {!isProcessing && (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setFiles([])}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Clear Queue
                  </button>
                  <button
                    onClick={handleStartProcessing}
                    className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Run MatchLens Analysis</span>
                  </button>
                </div>
              )}
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {files.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 flex items-center justify-between gap-4 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">
                        {item.name}
                      </p>
                      <span className="text-[11px] text-slate-400">
                        {(item.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 flex-shrink-0">
                    {item.status === "pending" && (
                      <span className="inline-flex items-center space-x-1 text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        <Clock className="w-3 h-3" />
                        <span>Ready to analyze</span>
                      </span>
                    )}

                    {item.status === "processing" && (
                      <span className="inline-flex items-center space-x-1 text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Extracting &amp; Matching...</span>
                      </span>
                    )}

                    {item.status === "success" && (
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-0.5 rounded font-semibold border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Score: {item.score}/100</span>
                        </span>
                      </div>
                    )}

                    {item.status === "duplicate" && (
                      <span className="inline-flex items-center space-x-1 text-amber-700 bg-amber-50 dark:bg-amber-950 px-2.5 py-0.5 rounded border border-amber-200">
                        <Copy className="w-3.5 h-3.5" />
                        <span>Duplicate Resume (SHA-256 match)</span>
                      </span>
                    )}

                    {item.status === "error" && (
                      <span
                        className="inline-flex items-center space-x-1 text-rose-700 bg-rose-50 dark:bg-rose-950 px-2.5 py-0.5 rounded border border-rose-200"
                        title={item.errorReason}
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{item.errorReason || "Parsing error"}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed CTA */}
        {successCount > 0 && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-200 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successCount} candidate(s) successfully evaluated with grounded evidence!</span>
            </div>

            <Link
              href={`/jobs/${jobId}/candidates`}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
            >
              <span>View Ranked Candidates</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
