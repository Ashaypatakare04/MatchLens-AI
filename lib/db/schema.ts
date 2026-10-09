/**
 * MatchLens AI - Relational Database Schema (Drizzle ORM / PostgreSQL)
 * 
 * Supports Organizations, Users, Jobs, Candidates, Analyses, and Audit Events
 * with multi-tenant isolation, primary keys, foreign keys, indexes, and optimistic locking.
 */

import {
  pgTable,
  text,
  timestamp,
  integer,
  doublePrecision,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type {
  ExtractedJobRequirements,
  ScoringWeights,
  EducationItem,
  WorkExperienceItem,
  CertificationItem,
  ProjectItem,
  SkillsMatchResult,
  ExperienceMatchResult,
  EducationMatchResult,
  ProjectMatchResult,
  ResponsibilityMatchItem,
  RequirementMatchItem,
  PotentialInconsistency,
  EvidenceItem,
  RecruiterFeedback,
  RecruiterDecision,
  PipelineStage,
  AIRecommendation,
} from "../types";

export const organizations = pgTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("organizations_slug_idx").on(table.slug),
  ]
);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    passwordHash: text("password_hash"),
    role: text("role").notNull().default("RECRUITER"), // "ADMIN" | "RECRUITER" | "VIEWER"
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("users_email_idx").on(table.email),
    index("users_org_email_idx").on(table.organizationId, table.email),
    index("users_org_idx").on(table.organizationId),
  ]
);

export const jobs = pgTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    company: text("company").notNull(),
    location: text("location").notNull(),
    workMode: text("work_mode").notNull().default("Remote"),
    employmentType: text("employment_type").notNull().default("Full-time"),
    rawDescription: text("raw_description").notNull(),
    requirements: jsonb("requirements").$type<ExtractedJobRequirements>().notNull(),
    weights: jsonb("weights").$type<ScoringWeights>().notNull(),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("jobs_org_idx").on(table.organizationId),
    index("jobs_org_created_at_idx").on(table.organizationId, table.createdAt),
  ]
);

export const candidates = pgTable(
  "candidates",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull().default(""),
    location: text("location").notNull().default(""),
    totalExperienceYears: doublePrecision("total_experience_years").notNull().default(0),
    statedExperienceYears: doublePrecision("stated_experience_years"),
    education: jsonb("education").$type<EducationItem[]>().notNull().default([]),
    workHistory: jsonb("work_history").$type<WorkExperienceItem[]>().notNull().default([]),
    skills: jsonb("skills").$type<string[]>().notNull().default([]),
    certifications: jsonb("certifications").$type<CertificationItem[]>().notNull().default([]),
    projects: jsonb("projects").$type<ProjectItem[]>().notNull().default([]),
    achievements: jsonb("achievements").$type<string[]>().notNull().default([]),
    rawResumeText: text("raw_resume_text").notNull().default(""),
    fileName: text("file_name").notNull(),
    fileType: text("file_type").notNull().default("pdf"),
    fileSize: integer("file_size").notNull().default(0),
    fileHash: text("file_hash").notNull(),
    parsingConfidence: text("parsing_confidence").notNull().default("medium"),
    parsingWarnings: jsonb("parsing_warnings").$type<string[]>().notNull().default([]),
    extractedAt: timestamp("extracted_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("candidates_org_idx").on(table.organizationId),
    index("candidates_job_idx").on(table.jobId),
    index("candidates_org_job_idx").on(table.organizationId, table.jobId),
    index("candidates_file_hash_idx").on(table.jobId, table.fileHash),
  ]
);

export const analyses = pgTable(
  "analyses",
  {
    id: text("id").primaryKey(),
    candidateId: text("candidate_id")
      .notNull()
      .unique()
      .references(() => candidates.id, { onDelete: "cascade" }),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    overallScore: doublePrecision("overall_score").notNull().default(0),
    scoreBreakdown: jsonb("score_breakdown")
      .$type<{
        skills: number;
        experience: number;
        education: number;
        projects: number;
        responsibilities: number;
      }>()
      .notNull(),
    weightedContributions: jsonb("weighted_contributions")
      .$type<{
        skills: number;
        experience: number;
        education: number;
        projects: number;
        responsibilities: number;
      }>()
      .notNull(),
    skillsAnalysis: jsonb("skills_analysis").$type<SkillsMatchResult>().notNull(),
    experienceAnalysis: jsonb("experience_analysis").$type<ExperienceMatchResult>().notNull(),
    educationAnalysis: jsonb("education_analysis").$type<EducationMatchResult>().notNull(),
    projectAnalysis: jsonb("project_analysis").$type<ProjectMatchResult>().notNull(),
    responsibilityAlignment: jsonb("responsibility_alignment")
      .$type<ResponsibilityMatchItem[]>()
      .notNull(),
    requirementMatches: jsonb("requirement_matches").$type<RequirementMatchItem[]>(),
    totalExperienceYears: doublePrecision("total_experience_years"),
    relevantExperienceYears: doublePrecision("relevant_experience_years"),
    matchingEngine: text("matching_engine").default("local_semantic"),
    strongMatches: jsonb("strong_matches").$type<string[]>().notNull().default([]),
    missingRequirements: jsonb("missing_requirements").$type<string[]>().notNull().default([]),
    potentialInconsistencies: jsonb("potential_inconsistencies")
      .$type<PotentialInconsistency[]>()
      .notNull()
      .default([]),
    evidenceLog: jsonb("evidence_log").$type<EvidenceItem[]>().notNull().default([]),
    aiRecommendation: text("ai_recommendation").$type<AIRecommendation>().notNull().default("Consider"),
    aiExplanation: text("ai_explanation").notNull().default(""),
    recruiterDecision: text("recruiter_decision").$type<RecruiterDecision>().notNull().default("unreviewed"),
    recruiterNotes: text("recruiter_notes").notNull().default(""),
    pipelineStage: text("pipeline_stage").$type<PipelineStage>().default("screening"),
    recruiterFeedback: jsonb("recruiter_feedback").$type<RecruiterFeedback>(),
    decisionTimestamp: timestamp("decision_timestamp", { withTimezone: true }),
    analyzedAt: timestamp("analyzed_at", { withTimezone: true }).notNull().defaultNow(),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("analyses_job_idx").on(table.jobId),
    index("analyses_candidate_idx").on(table.candidateId),
    index("analyses_score_idx").on(table.jobId, table.overallScore),
    index("analyses_decision_idx").on(table.jobId, table.recruiterDecision),
  ]
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    jobId: text("job_id").notNull(),
    candidateId: text("candidate_id"),
    actor: jsonb("actor")
      .$type<{
        userId: string;
        userName: string;
        role: "ADMIN" | "RECRUITER" | "VIEWER";
      }>()
      .notNull(),
    previousState: text("previous_state"),
    newState: text("new_state"),
    reasonCategory: text("reason_category"),
    notes: text("notes"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_org_idx").on(table.organizationId),
    index("audit_job_idx").on(table.jobId),
    index("audit_candidate_idx").on(table.candidateId),
    index("audit_timestamp_idx").on(table.timestamp),
    index("audit_type_idx").on(table.eventType),
  ]
);

export type Organization = typeof organizations.$inferSelect;
export type User = typeof users.$inferSelect;
export type JobRecord = typeof jobs.$inferSelect;
export type CandidateRecord = typeof candidates.$inferSelect;
export type AnalysisRecord = typeof analyses.$inferSelect;
export type AuditEventRecord = typeof auditEvents.$inferSelect;
