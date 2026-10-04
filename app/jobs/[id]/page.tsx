"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Briefcase,
  Users,
  FileUp,
  ArrowRight,
  MapPin,
  CheckCircle2,
  Sliders,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Job } from "@/lib/types";

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.id;
  const [job, setJob] = useState<Job | null>(null);
  const [candidatesCount, setCandidatesCount] = useState(0);

  useEffect(() => {
    fetch(`/api/jobs/${jobId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.job) {
          setJob(d.job);
          setCandidatesCount(d.candidatesCount || 0);
        }
      })
      .catch(console.error);
  }, [jobId]);

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100">
        <Navbar />
        <div className="p-8 text-center text-slate-500 text-sm">Loading job profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100 font-sans">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded">
                {job.company}
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {job.title}
              </h1>
              <p className="text-xs text-slate-500">
                {job.location} • {job.workMode} • {job.employmentType}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Link
                href={`/jobs/${job.id}/upload`}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition"
              >
                <FileUp className="w-3.5 h-3.5" />
                <span>Upload Resumes</span>
              </Link>

              <Link
                href={`/jobs/${job.id}/candidates`}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
              >
                <span>View Candidates ({candidatesCount})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Structured Requirements */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4 text-xs">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Structured Job Criteria
          </h2>

          <div className="space-y-2">
            <span className="font-semibold text-slate-600 dark:text-slate-400">Required Skills:</span>
            <div className="flex flex-wrap gap-1.5">
              {job.requirements.requiredSkills.map((s) => (
                <span
                  key={s}
                  className="px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="font-semibold text-slate-600 dark:text-slate-400">Preferred Skills:</span>
            <div className="flex flex-wrap gap-1.5">
              {job.requirements.preferredSkills.map((s) => (
                <span
                  key={s}
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <span className="font-semibold text-slate-600 dark:text-slate-400">
                Minimum Experience:
              </span>
              <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                {job.requirements.minExperienceYears}+ years
              </p>
            </div>
            <div>
              <span className="font-semibold text-slate-600 dark:text-slate-400">
                Education Requirement:
              </span>
              <p className="text-slate-900 dark:text-white mt-0.5">
                {job.requirements.educationRequirement}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
