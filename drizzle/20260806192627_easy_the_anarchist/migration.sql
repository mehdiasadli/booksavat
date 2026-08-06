CREATE TYPE "club_can_post" AS ENUM('all_members', 'moderators', 'admin_only');--> statement-breakpoint
CREATE TYPE "club_post_attachment_kind" AS ENUM('work', 'edition');--> statement-breakpoint
CREATE TYPE "club_post_type" AS ENUM('discussion', 'announcement', 'system');--> statement-breakpoint
CREATE TABLE "club_post" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"club_id" uuid NOT NULL,
	"author_user_id" uuid,
	"type" "club_post_type" DEFAULT 'discussion'::"club_post_type" NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"body" jsonb,
	"can_people_comment" boolean DEFAULT true NOT NULL,
	"can_people_react" boolean DEFAULT true NOT NULL,
	"pinned_at" timestamp,
	"deleted_at" timestamp,
	"related_session_id" uuid,
	"system_event_key" text,
	"reaction_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"reply_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "club_post_club_slug_uidx" UNIQUE("club_id","slug")
);
--> statement-breakpoint
CREATE TABLE "club_post_attachment" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"post_id" uuid NOT NULL,
	"kind" "club_post_attachment_kind" NOT NULL,
	"work_id" text,
	"edition_id" text
);
--> statement-breakpoint
CREATE TABLE "club_post_comment" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"post_id" uuid NOT NULL,
	"author_user_id" uuid NOT NULL,
	"parent_id" uuid,
	"depth" integer DEFAULT 0 NOT NULL,
	"body" jsonb NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "club_post_comment_reaction" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"comment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"emoji" text NOT NULL,
	CONSTRAINT "club_post_comment_reaction_comment_user_uidx" UNIQUE("comment_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "club_post_reaction" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"emoji" text NOT NULL,
	CONSTRAINT "club_post_reaction_post_user_uidx" UNIQUE("post_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "club" ADD COLUMN "community_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "club" ADD COLUMN "can_post" "club_can_post" DEFAULT 'all_members'::"club_can_post" NOT NULL;--> statement-breakpoint
ALTER TABLE "club" ADD COLUMN "default_can_people_comment" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "club" ADD COLUMN "default_can_people_react" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "club_post_session_event_uidx" ON "club_post" ("club_id","related_session_id","system_event_key");--> statement-breakpoint
CREATE INDEX "club_post_club_created_idx" ON "club_post" ("club_id","created_at");--> statement-breakpoint
CREATE INDEX "club_post_club_pinned_idx" ON "club_post" ("club_id","pinned_at");--> statement-breakpoint
CREATE INDEX "club_post_author_idx" ON "club_post" ("author_user_id");--> statement-breakpoint
CREATE INDEX "club_post_related_session_idx" ON "club_post" ("related_session_id");--> statement-breakpoint
CREATE INDEX "club_post_attachment_post_id_idx" ON "club_post_attachment" ("post_id");--> statement-breakpoint
CREATE UNIQUE INDEX "club_post_attachment_work_uidx" ON "club_post_attachment" ("post_id","work_id");--> statement-breakpoint
CREATE UNIQUE INDEX "club_post_attachment_edition_uidx" ON "club_post_attachment" ("post_id","edition_id");--> statement-breakpoint
CREATE INDEX "club_post_comment_post_id_idx" ON "club_post_comment" ("post_id");--> statement-breakpoint
CREATE INDEX "club_post_comment_parent_id_idx" ON "club_post_comment" ("parent_id");--> statement-breakpoint
CREATE INDEX "club_post_comment_author_id_idx" ON "club_post_comment" ("author_user_id");--> statement-breakpoint
CREATE INDEX "club_post_comment_reaction_comment_id_idx" ON "club_post_comment_reaction" ("comment_id");--> statement-breakpoint
CREATE INDEX "club_post_comment_reaction_user_id_idx" ON "club_post_comment_reaction" ("user_id");--> statement-breakpoint
CREATE INDEX "club_post_reaction_post_id_idx" ON "club_post_reaction" ("post_id");--> statement-breakpoint
CREATE INDEX "club_post_reaction_user_id_idx" ON "club_post_reaction" ("user_id");--> statement-breakpoint
ALTER TABLE "club_post" ADD CONSTRAINT "club_post_club_id_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "club"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "club_post" ADD CONSTRAINT "club_post_author_user_id_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "club_post" ADD CONSTRAINT "club_post_related_session_id_reading_session_id_fkey" FOREIGN KEY ("related_session_id") REFERENCES "reading_session"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "club_post_attachment" ADD CONSTRAINT "club_post_attachment_post_id_club_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "club_post"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "club_post_comment" ADD CONSTRAINT "club_post_comment_post_id_club_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "club_post"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "club_post_comment" ADD CONSTRAINT "club_post_comment_author_user_id_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "club_post_comment" ADD CONSTRAINT "club_post_comment_parent_id_club_post_comment_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "club_post_comment"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "club_post_comment_reaction" ADD CONSTRAINT "club_post_comment_reaction_comment_id_club_post_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "club_post_comment"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "club_post_comment_reaction" ADD CONSTRAINT "club_post_comment_reaction_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "club_post_reaction" ADD CONSTRAINT "club_post_reaction_post_id_club_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "club_post"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "club_post_reaction" ADD CONSTRAINT "club_post_reaction_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;