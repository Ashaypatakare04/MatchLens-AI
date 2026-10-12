CREATE TABLE "pilot_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"job_id" text NOT NULL,
	"candidate_id" text,
	"analysis_id" text,
	"user_id" text NOT NULL,
	"category" text NOT NULL,
	"disagreement_reason" text,
	"system_rank" integer,
	"system_score" double precision,
	"recruiter_decision" text,
	"comment" text,
	"perceived_trust_score" integer,
	"perceived_usefulness_score" integer,
	"time_saved_minutes" double precision,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pilot_feedback" ADD CONSTRAINT "pilot_feedback_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_feedback" ADD CONSTRAINT "pilot_feedback_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_feedback" ADD CONSTRAINT "pilot_feedback_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_feedback" ADD CONSTRAINT "pilot_feedback_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_feedback" ADD CONSTRAINT "pilot_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pfeedback_org_idx" ON "pilot_feedback" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "pfeedback_job_idx" ON "pilot_feedback" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "pfeedback_org_job_idx" ON "pilot_feedback" USING btree ("organization_id","job_id");--> statement-breakpoint
CREATE INDEX "pfeedback_candidate_idx" ON "pilot_feedback" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "pfeedback_category_idx" ON "pilot_feedback" USING btree ("category");--> statement-breakpoint
CREATE INDEX "pfeedback_created_at_idx" ON "pilot_feedback" USING btree ("created_at");
