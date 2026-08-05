CREATE TYPE "follow_status" AS ENUM('pending', 'accepted');--> statement-breakpoint
CREATE TABLE "follow" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"follower_id" uuid NOT NULL,
	"following_id" uuid NOT NULL,
	"status" "follow_status" DEFAULT 'pending'::"follow_status" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_private" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "follow_follower_following_uidx" ON "follow" ("follower_id","following_id");--> statement-breakpoint
CREATE INDEX "follow_following_status_idx" ON "follow" ("following_id","status");--> statement-breakpoint
CREATE INDEX "follow_follower_status_idx" ON "follow" ("follower_id","status");--> statement-breakpoint
ALTER TABLE "follow" ADD CONSTRAINT "follow_follower_id_user_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "follow" ADD CONSTRAINT "follow_following_id_user_id_fkey" FOREIGN KEY ("following_id") REFERENCES "user"("id") ON DELETE CASCADE;