CREATE TABLE "session_discussion_message" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"session_id" uuid NOT NULL,
	"author_user_id" uuid NOT NULL,
	"parent_id" uuid,
	"depth" integer DEFAULT 0 NOT NULL,
	"body" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_discussion_reaction" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"message_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"emoji" text NOT NULL,
	CONSTRAINT "session_discussion_reaction_message_user_uidx" UNIQUE("message_id","user_id")
);
--> statement-breakpoint
CREATE INDEX "session_discussion_session_id_idx" ON "session_discussion_message" ("session_id");--> statement-breakpoint
CREATE INDEX "session_discussion_parent_id_idx" ON "session_discussion_message" ("parent_id");--> statement-breakpoint
CREATE INDEX "session_discussion_author_id_idx" ON "session_discussion_message" ("author_user_id");--> statement-breakpoint
CREATE INDEX "session_discussion_reaction_message_id_idx" ON "session_discussion_reaction" ("message_id");--> statement-breakpoint
CREATE INDEX "session_discussion_reaction_user_id_idx" ON "session_discussion_reaction" ("user_id");--> statement-breakpoint
ALTER TABLE "session_discussion_message" ADD CONSTRAINT "session_discussion_message_session_id_reading_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "reading_session"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session_discussion_message" ADD CONSTRAINT "session_discussion_message_author_user_id_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session_discussion_message" ADD CONSTRAINT "session_discussion_message_ZjS8JdyU8NEw_fkey" FOREIGN KEY ("parent_id") REFERENCES "session_discussion_message"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session_discussion_reaction" ADD CONSTRAINT "session_discussion_reaction_Itw1kdvFqkM7_fkey" FOREIGN KEY ("message_id") REFERENCES "session_discussion_message"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session_discussion_reaction" ADD CONSTRAINT "session_discussion_reaction_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;