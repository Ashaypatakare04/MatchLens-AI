ALTER TABLE "audit_events" DROP CONSTRAINT "audit_events_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "candidates" DROP CONSTRAINT "candidates_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "jobs" DROP CONSTRAINT "jobs_organization_id_organizations_id_fk";
--> statement-breakpoint
DROP INDEX "jobs_created_at_idx";--> statement-breakpoint
INSERT INTO "organizations" ("id", "name", "slug", "created_at", "updated_at")
VALUES ('org-demo-cloudscale', 'CloudScale Technologies', 'cloudscale', now(), now())
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
UPDATE "jobs" SET "organization_id" = 'org-demo-cloudscale' WHERE "organization_id" IS NULL;
--> statement-breakpoint
UPDATE "candidates" SET "organization_id" = 'org-demo-cloudscale' WHERE "organization_id" IS NULL;
--> statement-breakpoint
UPDATE "audit_events" SET "organization_id" = 'org-demo-cloudscale' WHERE "organization_id" IS NULL;
--> statement-breakpoint
UPDATE "users" SET "organization_id" = 'org-demo-cloudscale' WHERE "organization_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "audit_events" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "candidates" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_org_idx" ON "audit_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "candidates_org_job_idx" ON "candidates" USING btree ("organization_id","job_id");--> statement-breakpoint
CREATE INDEX "jobs_org_created_at_idx" ON "jobs" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_org_idx" ON "users" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");