"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Layers,
  Sparkles,
  ShieldAlert,
  Briefcase,
  Settings,
  RefreshCw,
  CheckCircle2,
  Cpu,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [aiStatus, setAiStatus] = useState<string>("Semantic analysis enabled");
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d?.status?.statusBadge) {
          setAiStatus(d.status.statusBadge);
        }
      })
      .catch(() => {});
  }, []);

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch("/api/demo/seed", { method: "POST" });
      if (res.ok) {
        setSeedSuccess(true);
        setTimeout(() => setSeedSuccess(false), 3000);
        router.push("/jobs/job-cloudscale-sr-fullstack/candidates");
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to seed demo data:", err);
    } finally {
      setIsSeeding(false);
    }
  };

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: Layers },
    { href: "/jobs/new", label: "Create Job", icon: Briefcase },
    { href: "/evaluation", label: "AI Evaluation & Benchmark", icon: Sparkles },
    { href: "/test-suite", label: "Edge Cases", icon: ShieldAlert },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:bg-indigo-700 transition">
              <Sparkles className="w-5 h-5 text-indigo-100" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 dark:text-white tracking-tight leading-none text-base">
                MatchLens <span className="text-indigo-600 dark:text-indigo-400">AI</span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-tight mt-0.5">
                Evidence-backed candidate matching
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    isActive
                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700">
            <Cpu className="w-3 h-3 text-emerald-500 animate-pulse" />
            <span>{aiStatus}</span>
          </div>

          <button
            onClick={handleSeedDemo}
            disabled={isSeeding}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm transition border ${
              seedSuccess
                ? "bg-emerald-600 border-emerald-600 text-white"
                : "bg-indigo-600 hover:bg-indigo-700 border-indigo-600 text-white"
            } disabled:opacity-50`}
            title="Load 1 job & 10 sample candidates with contradictions, messy formats & varied ranks"
          >
            {seedSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Demo Loaded!</span>
              </>
            ) : (
              <>
                <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? "animate-spin" : ""}`} />
                <span>{isSeeding ? "Seeding..." : "Load Demo Dataset"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
