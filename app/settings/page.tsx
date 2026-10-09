"use client";

import { useEffect, useState } from "react";
import {
  Cpu,
  CheckCircle2,
  FileText,
  Sliders,
  History,
  Lock,
  EyeOff,
  Trash2,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { AuditEvent } from "@/lib/engine/audit-logger";

export default function SettingsPage() {
  const [systemInfo, setSystemInfo] = useState<{
    status?: { provider?: string; isAvailable?: boolean };
    system?: {
      integrityEngine?: string;
      securityStandards?: {
        promptInjectionDefense?: string;
        fileUploadLimits?: string;
        deterministicScoring?: string;
      };
    };
  } | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettingsAndAudit = async () => {
      try {
        const [settingsRes, auditRes] = await Promise.all([
          fetch("/api/settings"),
          fetch("/api/audit-log?limit=20"),
        ]);

        if (settingsRes.ok) {
          const json = await settingsRes.json();
          setSystemInfo(json);
        }
        if (auditRes.ok) {
          const auditJson = await auditRes.json();
          setAuditEvents(auditJson.events || []);
        }
      } catch (err) {
        console.error("Failed to load settings or audit log:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettingsAndAudit();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100 font-sans">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            System Settings &amp; Compliance Architecture
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Engine pipeline configurations, security boundaries, GDPR retention policies, and immutable decision audit log.
          </p>
        </div>

        {/* Top 2x2 Grid: Core Engine & Parser Specs */}
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
                  {systemInfo?.status?.provider === "gemini"
                    ? "Google Gemini 2.5 Flash"
                    : "Hybrid Deterministic NLP (Zero Failure Risk)"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Fallback Strategy:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Instant Local Deterministic Engine
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Integrity Verification:</span>
                <span className="font-semibold text-emerald-600">
                  {systemInfo?.system?.integrityEngine ||
                    "Active (Date, Claim & Tenure Reconciliation)"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Score Determinism:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Strict Mathematical (LLM never determines scores)
                </span>
              </div>
            </div>
          </div>

          {/* Document Parser & Ingestion Guard */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Document Extraction &amp; Sanitization
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
                <span className="text-slate-500">Header Inspection:</span>
                <span className="font-mono text-slate-900 dark:text-white">Magic Byte Signature (%PDF-, PK\x03\x04)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Deduplication:</span>
                <span className="font-mono text-slate-900 dark:text-white">SHA-256 Cryptographic Hash</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security & GDPR Compliance Standards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-3">
            <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Prompt Injection Defense
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Resumes and job descriptions are treated as untrusted input. Multi-vector heuristic pattern matching flags jailbreak tokens, and candidate data is strictly fenced in safe XML blocks.
            </p>
            <div className="pt-2 text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              ✓ Active (Defense in Depth)
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
              <EyeOff className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Blind Screening &amp; Bias Shield
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Recruiters can toggle anonymized screening mode to mask candidate names, contact PII, and normalize university prestige bias to promote merit-based evaluation.
            </p>
            <div className="pt-2 text-[11px] font-mono font-semibold text-purple-600 dark:text-purple-400">
              ✓ Active (Single-Click Toggle)
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
              <Trash2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              GDPR Right-to-be-Forgotten
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Full candidate profiles, extracted text, and evaluation signals can be permanently purged upon request. All purge requests generate an immutable compliance event.
            </p>
            <div className="pt-2 text-[11px] font-mono font-semibold text-amber-600 dark:text-amber-400">
              ✓ Compliant (Hard Purge API)
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
            These default weights are configured globally and can be dynamically calibrated per-job by any recruiter with real-time candidate score recalculation.
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

        {/* Immutable Audit Log Viewer */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <History className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Live Audit Trail &amp; Decision History
              </h3>
            </div>
            <span className="text-xs text-slate-500">
              Showing {auditEvents.length} most recent compliance events
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Every candidate stage transition, scoring weight adjustment, export dossier generation, calibration override, and GDPR deletion is cryptographically tracked in this immutable log.
          </p>

          <div className="overflow-x-auto">
            {auditEvents.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No auditable actions logged yet in this session.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-2.5">Timestamp</th>
                    <th className="p-2.5">Event Type</th>
                    <th className="p-2.5">Actor</th>
                    <th className="p-2.5">Candidate / Target</th>
                    <th className="p-2.5">Transition / Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {auditEvents.map((evt) => (
                    <tr key={evt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {new Date(evt.timestamp).toLocaleString()}
                      </td>
                      <td className="p-2.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                            evt.eventType === "candidate_decision_changed"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : evt.eventType === "candidate_stage_changed"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : evt.eventType === "candidate_deleted"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : evt.eventType === "candidate_exported"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                              : evt.eventType === "recruiter_calibration_feedback"
                              ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                              : evt.eventType === "weights_recalculated"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {evt.eventType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-700 dark:text-slate-300 font-medium">
                        {evt.actor.userName} ({evt.actor.role})
                      </td>
                      <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                        {evt.candidateId || evt.jobId}
                      </td>
                      <td className="p-2.5 text-slate-700 dark:text-slate-300">
                        {evt.previousState && evt.newState ? (
                          <span>
                            <span className="line-through text-slate-400">{evt.previousState}</span>
                            {" → "}
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">{evt.newState}</span>
                          </span>
                        ) : evt.notes ? (
                          <span className="line-clamp-1">{evt.notes}</span>
                        ) : (
                          <span className="text-slate-400">Standard audit trail</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
