CREATE TABLE "session_shortlist_item" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"session_id" uuid NOT NULL,
	"work_id" text NOT NULL,
	"added_by_user_id" uuid NOT NULL,
	CONSTRAINT "session_shortlist_session_work_uidx" UNIQUE("session_id","work_id")
);
--> statement-breakpoint
CREATE TABLE "session_vote_assignment" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"points" integer NOT NULL,
	"work_id" text NOT NULL,
	CONSTRAINT "session_vote_session_user_points_uidx" UNIQUE("session_id","user_id","points"),
	CONSTRAINT "session_vote_session_user_work_uidx" UNIQUE("session_id","user_id","work_id")
);
--> statement-breakpoint
ALTER TABLE "club" ADD COLUMN "vote_chips_by_role" jsonb DEFAULT '{"admin":[1,2,3],"moderator":[1,2,3],"member":[1,2,3]}' NOT NULL;--> statement-breakpoint
ALTER TABLE "reading_session" ADD COLUMN "vote_chips_by_role" jsonb;--> statement-breakpoint
ALTER TABLE "session_participant" ADD COLUMN "vote_blocked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "session_shortlist_session_id_idx" ON "session_shortlist_item" ("session_id");--> statement-breakpoint
CREATE INDEX "session_shortlist_work_id_idx" ON "session_shortlist_item" ("work_id");--> statement-breakpoint
CREATE INDEX "session_vote_session_id_idx" ON "session_vote_assignment" ("session_id");--> statement-breakpoint
CREATE INDEX "session_vote_user_id_idx" ON "session_vote_assignment" ("user_id");--> statement-breakpoint
ALTER TABLE "session_shortlist_item" ADD CONSTRAINT "session_shortlist_item_session_id_reading_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "reading_session"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session_shortlist_item" ADD CONSTRAINT "session_shortlist_item_added_by_user_id_user_id_fkey" FOREIGN KEY ("added_by_user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session_vote_assignment" ADD CONSTRAINT "session_vote_assignment_session_id_reading_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "reading_session"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session_vote_assignment" ADD CONSTRAINT "session_vote_assignment_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;