import fs from "fs";
import path from "path";
import {
  Job,
  CandidateProfile,
  MatchAnalysis,
  ScoringWeights,
  RecruiterDecision,
} from "../types";
import { getSeededDemoCandidates, DEMO_JOB_ID } from "../demo-data";
import { analyzeCandidate } from "../engine/analyzer";

interface DatabaseSchema {
  jobs: Record<string, Job>;
  candidates: Record<string, CandidateProfile>;
  matches: Record<string, MatchAnalysis>;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

let memoryDb: DatabaseSchema | null = null;

function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadDatabase(): DatabaseSchema {
  if (memoryDb) return memoryDb;

  ensureDataDirectory();

  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      memoryDb = JSON.parse(content);
      if (memoryDb && memoryDb.jobs) {
        return memoryDb;
      }
    } catch (err) {
      console.warn("Could not read db.json, seeding demo data instead:", err);
    }
  }

  // Seed demo data
  const { job, candidates, matches } = getSeededDemoCandidates();
  const seededDb: DatabaseSchema = {
    jobs: { [job.id]: job },
    candidates: {},
    matches: {},
  };

  for (const c of candidates) {
    seededDb.candidates[c.id] = c;
  }
  for (const m of matches) {
    seededDb.matches[m.candidateId] = m;
  }

  saveDatabase(seededDb);
  memoryDb = seededDb;
  return seededDb;
}

function saveDatabase(db: DatabaseSchema) {
  try {
    ensureDataDirectory();
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write db.json:", err);
  }
}

export const Store = {
  getJobs(): Job[] {
    const db = loadDatabase();
    return Object.values(db.jobs).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  getJob(id: string): Job | null {
    const db = loadDatabase();
    return db.jobs[id] || null;
  },

  createJob(job: Job): Job {
    const db = loadDatabase();
    db.jobs[job.id] = job;
    saveDatabase(db);
    return job;
  },

  updateJob(id: string, updates: Partial<Job>): Job | null {
    const db = loadDatabase();
    if (!db.jobs[id]) return null;
    db.jobs[id] = { ...db.jobs[id], ...updates, updatedAt: new Date().toISOString() };
    saveDatabase(db);
    return db.jobs[id];
  },

  deleteJob(id: string): boolean {
    const db = loadDatabase();
    if (!db.jobs[id]) return false;
    delete db.jobs[id];

    // Delete associated candidates & matches
    for (const [cid, cand] of Object.entries(db.candidates)) {
      if (cand.jobId === id) {
        delete db.candidates[cid];
        delete db.matches[cid];
      }
    }

    saveDatabase(db);
    return true;
  },

  getCandidates(jobId: string): CandidateProfile[] {
    const db = loadDatabase();
    return Object.values(db.candidates).filter((c) => c.jobId === jobId);
  },

  getCandidate(id: string): CandidateProfile | null {
    const db = loadDatabase();
    return db.candidates[id] || null;
  },

  getMatches(jobId: string): MatchAnalysis[] {
    const db = loadDatabase();
    return Object.values(db.matches)
      .filter((m) => m.jobId === jobId)
      .sort((a, b) => b.overallScore - a.overallScore);
  },

  getMatch(candidateId: string): MatchAnalysis | null {
    const db = loadDatabase();
    return db.matches[candidateId] || null;
  },

  saveCandidateWithMatch(candidate: CandidateProfile, match: MatchAnalysis) {
    const db = loadDatabase();
    db.candidates[candidate.id] = candidate;
    db.matches[candidate.id] = match;
    saveDatabase(db);
  },

  updateRecruiterDecision(
    candidateId: string,
    decision: RecruiterDecision,
    notes?: string
  ): MatchAnalysis | null {
    const db = loadDatabase();
    const match = db.matches[candidateId];
    if (!match) return null;

    match.recruiterDecision = decision;
    if (notes !== undefined) {
      match.recruiterNotes = notes;
    }
    match.decisionTimestamp = new Date().toISOString();
    db.matches[candidateId] = match;
    saveDatabase(db);
    return match;
  },

  rescoreJob(jobId: string, weights: ScoringWeights): MatchAnalysis[] {
    const db = loadDatabase();
    const job = db.jobs[jobId];
    if (!job) return [];

    job.weights = weights;
    job.updatedAt = new Date().toISOString();

    const candidates = Object.values(db.candidates).filter((c) => c.jobId === jobId);
    const updatedMatches: MatchAnalysis[] = [];

    for (const cand of candidates) {
      const existing = db.matches[cand.id];
      const newAnalysis = analyzeCandidate(cand, job, weights);
      // Preserve recruiter decisions and notes
      if (existing) {
        newAnalysis.recruiterDecision = existing.recruiterDecision;
        newAnalysis.recruiterNotes = existing.recruiterNotes;
        newAnalysis.decisionTimestamp = existing.decisionTimestamp;
      }
      db.matches[cand.id] = newAnalysis;
      updatedMatches.push(newAnalysis);
    }

    saveDatabase(db);
    return updatedMatches.sort((a, b) => b.overallScore - a.overallScore);
  },

  resetDemoData(): { job: Job; candidatesCount: number } {
    const { job, candidates, matches } = getSeededDemoCandidates();
    const db: DatabaseSchema = {
      jobs: { [job.id]: job },
      candidates: {},
      matches: {},
    };

    for (const c of candidates) {
      db.candidates[c.id] = c;
    }
    for (const m of matches) {
      db.matches[m.candidateId] = m;
    }

    memoryDb = db;
    saveDatabase(db);

    return { job, candidatesCount: candidates.length };
  },
};
