CREATE TABLE "processing_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"job_id" text NOT NULL,
	"document_id" text NOT NULL,
	"candidate_id" text,
	"file_name" text NOT NULL,
	"file_size" integer DEFAULT 0 NOT NULL,
	"file_hash" text NOT NULL,
	"status" text DEFAULT 'QUEUED' NOT NULL,
	"current_stage" text DEFAULT 'queued' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"idempotency_key" text NOT NULL,
	"error_code" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"heartbeat_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "processing_jobs_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "processing_outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"processing_job_id" text NOT NULL,
	"event_type" text DEFAULT 'resume.process' NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_document_id_resume_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."resume_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_outbox" ADD CONSTRAINT "processing_outbox_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_outbox" ADD CONSTRAINT "processing_outbox_processing_job_id_processing_jobs_id_fk" FOREIGN KEY ("processing_job_id") REFERENCES "public"."processing_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pjobs_org_idx" ON "processing_jobs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "pjobs_job_idx" ON "processing_jobs" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "pjobs_doc_idx" ON "processing_jobs" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "pjobs_status_idx" ON "processing_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pjobs_org_status_idx" ON "processing_jobs" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "pjobs_heartbeat_idx" ON "processing_jobs" USING btree ("heartbeat_at");--> statement-breakpoint
CREATE INDEX "poutbox_org_idx" ON "processing_outbox" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "poutbox_status_idx" ON "processing_outbox" USING btree ("status");--> statement-breakpoint
CREATE INDEX "poutbox_job_idx" ON "processing_outbox" USING btree ("processing_job_id");