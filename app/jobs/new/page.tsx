"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Briefcase,
  Building2,
  MapPin,
  Check,
  Plus,
  X,
  FileText,
  Sliders,
  ArrowRight,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { extractJobRequirementsFromText } from "@/lib/extractor/job-extractor";
import { ExtractedJobRequirements } from "@/lib/types";

const SAMPLE_JOB_DESCRIPTION = `
About CloudScale Technologies:
CloudScale Technologies builds mission-critical data processing platforms and real-time observability pipelines for high-growth enterprises worldwide.

Role Overview:
We are seeking an experienced Senior Full-Stack & Cloud Platform Engineer to spearhead the architecture and delivery of our core analytics dashboard and distributed ingestion services. You will partner with our product teams and platform architects to build resilient, high-throughput web applications.

Key Responsibilities:
- Architect, build, and maintain high-throughput web applications and scalable distributed REST & GraphQL APIs.
- Lead frontend development using modern React, TypeScript, and state-management frameworks.
- Design and optimize relational database schemas, transactions, and indexing using PostgreSQL.
- Package and deploy containerized microservices into production environments using Docker and Kubernetes.
- Drive engineering excellence through automated testing, CI/CD pipeline improvements, and code reviews.
- Troubleshoot distributed system bottlenecks and ensure 99.99% service availability.

Requirements & Qualifications:
- 5+ years of hands-on professional software engineering experience.
- Deep proficiency with modern TypeScript and React (including state management, hooks, and performance tuning).
- Strong server-side engineering proficiency with Node.js and RESTful architecture.
- Extensive production experience with PostgreSQL (complex queries, indexing, migrations).
- Hands-on experience with Docker containerization and modern deployment workflows.
- Bachelor's degree in Computer Science, Software Engineering, or equivalent practical industry experience.

Preferred Qualifications (Nice to Have):
- Experience orchestrating container workloads with Kubernetes in production.
- Familiarity with cloud platforms (AWS or GCP).
- Experience with GraphQL APIs and caching strategies (Redis).
- Styling proficiency with Tailwind CSS.
`.trim();

export default function CreateJobPage() {
  const router = useRouter();
  const [title, setTitle] = useState("Senior Full-Stack & Cloud Platform Engineer");
  const [company, setCompany] = useState("CloudScale Technologies");
  const [location, setLocation] = useState("San Francisco, CA (or Remote)");
  const [workMode, setWorkMode] = useState<"Remote" | "Hybrid" | "On-site">("Hybrid");
  const [employmentType, setEmploymentType] = useState<"Full-time" | "Contract" | "Part-time" | "Internship">("Full-time");
  const [rawDescription, setRawDescription] = useState(SAMPLE_JOB_DESCRIPTION);

  // Extracted structured state
  const [requirements, setRequirements] = useState<ExtractedJobRequirements>(() =>
    extractJobRequirementsFromText(SAMPLE_JOB_DESCRIPTION)
  );

  const [newRequiredSkill, setNewRequiredSkill] = useState("");
  const [newPreferredSkill, setNewPreferredSkill] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extractedNotice, setExtractedNotice] = useState(true);

  const handleExtractFromText = () => {
    const extracted = extractJobRequirementsFromText(rawDescription);
    setRequirements(extracted);
    setExtractedNotice(true);
  };

  const handleAddRequiredSkill = () => {
    if (newRequiredSkill.trim() && !requirements.requiredSkills.includes(newRequiredSkill.trim())) {
      setRequirements((prev) => ({
        ...prev,
        requiredSkills: [...prev.requiredSkills, newRequiredSkill.trim()],
      }));
      setNewRequiredSkill("");
    }
  };

  const handleRemoveRequiredSkill = (skill: string) => {
    setRequirements((prev) => ({
      ...prev,
      requiredSkills: prev.requiredSkills.filter((s) => s !== skill),
    }));
  };

  const handleAddPreferredSkill = () => {
    if (newPreferredSkill.trim() && !requirements.preferredSkills.includes(newPreferredSkill.trim())) {
      setRequirements((prev) => ({
        ...prev,
        preferredSkills: [...prev.preferredSkills, newPreferredSkill.trim()],
      }));
      setNewPreferredSkill("");
    }
  };

  const handleRemovePreferredSkill = (skill: string) => {
    setRequirements((prev) => ({
      ...prev,
      preferredSkills: prev.preferredSkills.filter((s) => s !== skill),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          company,
          location,
          workMode,
          employmentType,
          rawDescription,
          customRequirements: requirements,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        router.push(`/jobs/${json.job.id}/upload`);
      }
    } catch (err) {
      console.error("Failed to create job:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <div className="flex items-center space-x-2 text-xs text-indigo-600 font-semibold mb-1">
            <Briefcase className="w-4 h-4" />
            <span>Step 1 of Recruiter Workflow</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Create Job &amp; Extract Criteria
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Paste your job description. MatchLens extracts structured requirements and allows you to customize criteria before uploading resumes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Job Details */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Role Metadata
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Job Title *
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Senior Full-Stack Engineer"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Company / Organization *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. CloudScale Technologies"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. San Francisco or Remote"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Work Mode
                </label>
                <select
                  value={workMode}
                  onChange={(e) => setWorkMode(e.target.value as "Remote" | "Hybrid" | "On-site")}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Hybrid">Hybrid</option>
                  <option value="Remote">Remote</option>
                  <option value="On-site">On-site</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Employment Type
                </label>
                <select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value as "Full-time" | "Contract" | "Part-time" | "Internship")}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>
            </div>
          </div>

          {/* Job Description Textarea */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Full Job Description *
              </label>
              <button
                type="button"
                onClick={handleExtractFromText}
                className="inline-flex items-center space-x-1.5 px-3 py-1 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 transition border border-indigo-200 dark:border-indigo-800"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Re-Extract Requirements</span>
              </button>
            </div>

            <textarea
              rows={8}
              required
              value={rawDescription}
              onChange={(e) => {
                setRawDescription(e.target.value);
                setExtractedNotice(false);
              }}
              className="w-full p-3 font-mono text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
            />
          </div>

          {/* Extracted Structured Requirements Review & Edit */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-indigo-200 dark:border-indigo-900/60 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Extracted Requirements (Editable by Recruiter)
                </h2>
              </div>
              {extractedNotice && (
                <span className="text-xs text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  ✓ Structured extraction synced
                </span>
              )}
            </div>

            {/* Required Skills */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Required Technical Skills (High Weight)
              </label>
              <div className="flex flex-wrap gap-2 items-center">
                {requirements.requiredSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRequiredSkill(skill)}
                      className="text-indigo-400 hover:text-indigo-700 ml-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
                <div className="inline-flex items-center space-x-1">
                  <input
                    type="text"
                    placeholder="Add skill..."
                    value={newRequiredSkill}
                    onChange={(e) => setNewRequiredSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddRequiredSkill();
                      }
                    }}
                    className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 w-28 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddRequiredSkill}
                    className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Preferred Skills */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Preferred Skills (Bonus Weight)
              </label>
              <div className="flex flex-wrap gap-2 items-center">
                {requirements.preferredSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePreferredSkill(skill)}
                      className="text-slate-400 hover:text-slate-700 ml-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
                <div className="inline-flex items-center space-x-1">
                  <input
                    type="text"
                    placeholder="Add bonus skill..."
                    value={newPreferredSkill}
                    onChange={(e) => setNewPreferredSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddPreferredSkill();
                      }
                    }}
                    className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 w-32 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddPreferredSkill}
                    className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Experience & Education */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Minimum Experience Requirement (Years)
                </label>
                <input
                  type="number"
                  min="0"
                  max="25"
                  value={requirements.minExperienceYears}
                  onChange={(e) =>
                    setRequirements((prev) => ({
                      ...prev,
                      minExperienceYears: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Education Requirement Description
                </label>
                <input
                  type="text"
                  value={requirements.educationRequirement}
                  onChange={(e) =>
                    setRequirements((prev) => ({
                      ...prev,
                      educationRequirement: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Extracted Responsibilities */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Key Responsibilities To Match Against ({requirements.keyResponsibilities.length})
              </label>
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                {requirements.keyResponsibilities.map((resp, i) => (
                  <div key={i} className="flex items-start space-x-2">
                    <span className="text-indigo-600 font-bold">•</span>
                    <span>{resp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition disabled:opacity-50"
            >
              <span>{isSubmitting ? "Creating Job..." : "Save Job & Proceed to Resume Upload"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
