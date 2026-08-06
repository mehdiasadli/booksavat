CREATE TYPE "reading_session_status" AS ENUM('proposed', 'voting', 'pending', 'reading', 'reviewing', 'completed', 'cancelled', 'abandoned');--> statement-breakpoint
CREATE TABLE "reading_session" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"club_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"status" "reading_session_status" DEFAULT 'proposed'::"reading_session_status" NOT NULL,
	"title" text,
	"join_deadline" timestamp NOT NULL,
	"reading_deadline" timestamp,
	"selected_work_id" text
);
--> statement-breakpoint
CREATE TABLE "session_participant" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_participant_session_user_uidx" UNIQUE("session_id","user_id")
);
--> statement-breakpoint
CREATE INDEX "reading_session_club_id_idx" ON "reading_session" ("club_id");--> statement-breakpoint
CREATE INDEX "reading_session_club_status_idx" ON "reading_session" ("club_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "reading_session_one_live_per_club_uidx" ON "reading_session" ("club_id") WHERE "status" in ('proposed', 'voting', 'pending', 'reading', 'reviewing');--> statement-breakpoint
CREATE INDEX "session_participant_user_id_idx" ON "session_participant" ("user_id");--> statement-breakpoint
CREATE INDEX "session_participant_session_id_idx" ON "session_participant" ("session_id");--> statement-breakpoint
ALTER TABLE "reading_session" ADD CONSTRAINT "reading_session_club_id_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "club"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "reading_session" ADD CONSTRAINT "reading_session_created_by_user_id_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session_participant" ADD CONSTRAINT "session_participant_session_id_reading_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "reading_session"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session_participant" ADD CONSTRAINT "session_participant_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;