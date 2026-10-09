CREATE TABLE "analyses" (
	"id" text PRIMARY KEY NOT NULL,
	"candidate_id" text NOT NULL,
	"job_id" text NOT NULL,
	"overall_score" double precision DEFAULT 0 NOT NULL,
	"score_breakdown" jsonb NOT NULL,
	"weighted_contributions" jsonb NOT NULL,
	"skills_analysis" jsonb NOT NULL,
	"experience_analysis" jsonb NOT NULL,
	"education_analysis" jsonb NOT NULL,
	"project_analysis" jsonb NOT NULL,
	"responsibility_alignment" jsonb NOT NULL,
	"requirement_matches" jsonb,
	"total_experience_years" double precision,
	"relevant_experience_years" double precision,
	"matching_engine" text DEFAULT 'local_semantic',
	"strong_matches" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"missing_requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"potential_inconsistencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence_log" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ai_recommendation" text DEFAULT 'Consider' NOT NULL,
	"ai_explanation" text DEFAULT '' NOT NULL,
	"recruiter_decision" text DEFAULT 'unreviewed' NOT NULL,
	"recruiter_notes" text DEFAULT '' NOT NULL,
	"pipeline_stage" text DEFAULT 'screening',
	"recruiter_feedback" jsonb,
	"decision_timestamp" timestamp with time zone,
	"analyzed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analyses_candidate_id_unique" UNIQUE("candidate_id")
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text,
	"event_type" text NOT NULL,
	"job_id" text NOT NULL,
	"candidate_id" text,
	"actor" jsonb NOT NULL,
	"previous_state" text,
	"new_state" text,
	"reason_category" text,
	"notes" text,
	"metadata" jsonb,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text,
	"job_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"total_experience_years" double precision DEFAULT 0 NOT NULL,
	"stated_experience_years" double precision,
	"education" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"work_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"certifications" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"projects" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"achievements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"raw_resume_text" text DEFAULT '' NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text DEFAULT 'pdf' NOT NULL,
	"file_size" integer DEFAULT 0 NOT NULL,
	"file_hash" text NOT NULL,
	"parsing_confidence" text DEFAULT 'medium' NOT NULL,
	"parsing_warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"extracted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text,
	"title" text NOT NULL,
	"company" text NOT NULL,
	"location" text NOT NULL,
	"work_mode" text DEFAULT 'Remote' NOT NULL,
	"employment_type" text DEFAULT 'Full-time' NOT NULL,
	"raw_description" text NOT NULL,
	"requirements" jsonb NOT NULL,
	"weights" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'RECRUITER' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analyses_job_idx" ON "analyses" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "analyses_candidate_idx" ON "analyses" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "analyses_score_idx" ON "analyses" USING btree ("job_id","overall_score");--> statement-breakpoint
CREATE INDEX "analyses_decision_idx" ON "analyses" USING btree ("job_id","recruiter_decision");--> statement-breakpoint
CREATE INDEX "audit_job_idx" ON "audit_events" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "audit_candidate_idx" ON "audit_events" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "audit_timestamp_idx" ON "audit_events" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "audit_type_idx" ON "audit_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "candidates_job_idx" ON "candidates" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "candidates_file_hash_idx" ON "candidates" USING btree ("job_id","file_hash");--> statement-breakpoint
CREATE INDEX "candidates_org_idx" ON "candidates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "jobs_org_idx" ON "jobs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "jobs_created_at_idx" ON "jobs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_idx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "users_org_email_idx" ON "users" USING btree ("organization_id","email");