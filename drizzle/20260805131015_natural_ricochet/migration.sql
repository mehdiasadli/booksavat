CREATE TYPE "reading_log_status" AS ENUM('reading', 'completed', 'dnf');--> statement-breakpoint
CREATE TABLE "reading_log" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"user_id" uuid NOT NULL,
	"work_id" text NOT NULL,
	"status" "reading_log_status" NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp,
	"is_reread" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX "reading_log_user_work_idx" ON "reading_log" ("user_id","work_id");--> statement-breakpoint
CREATE INDEX "reading_log_user_finished_at_idx" ON "reading_log" ("user_id","finished_at");--> statement-breakpoint
CREATE INDEX "reading_log_user_created_at_idx" ON "reading_log" ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "reading_log" ADD CONSTRAINT "reading_log_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
-- Backfill one log per existing Reading/Completed/DNF shelf membership.
INSERT INTO "reading_log" ("updated_at", "user_id", "work_id", "status", "started_at", "finished_at", "is_reread", "created_at")
SELECT
	si."created_at",
	s."user_id",
	si."work_id",
	s."system_key"::text::"reading_log_status",
	si."created_at",
	CASE
		WHEN s."system_key" IN ('completed', 'dnf') THEN si."created_at"
		ELSE NULL
	END,
	false,
	si."created_at"
FROM "shelf_item" si
INNER JOIN "shelf" s ON s."id" = si."shelf_id"
WHERE s."is_system" = true
	AND s."system_key" IN ('reading', 'completed', 'dnf');