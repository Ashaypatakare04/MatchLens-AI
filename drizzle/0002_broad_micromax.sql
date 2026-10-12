CREATE TABLE "resume_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"job_id" text NOT NULL,
	"candidate_id" text,
	"storage_key" text NOT NULL,
	"storage_provider" text DEFAULT 'local' NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text DEFAULT 'pdf' NOT NULL,
	"mime_type" text DEFAULT 'application/pdf' NOT NULL,
	"file_size" integer DEFAULT 0 NOT NULL,
	"file_hash" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"retention_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "resume_documents" ADD CONSTRAINT "resume_documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_documents" ADD CONSTRAINT "resume_documents_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_documents" ADD CONSTRAINT "resume_documents_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "resume_docs_org_idx" ON "resume_documents" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "resume_docs_job_idx" ON "resume_documents" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "resume_docs_candidate_idx" ON "resume_documents" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "resume_docs_org_hash_idx" ON "resume_documents" USING btree ("organization_id","file_hash");--> statement-breakpoint
CREATE INDEX "resume_docs_status_idx" ON "resume_documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "resume_docs_retention_idx" ON "resume_documents" USING btree ("retention_expires_at");