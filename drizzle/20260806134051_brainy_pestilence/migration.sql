CREATE TYPE "club_member_role" AS ENUM('admin', 'moderator', 'member');--> statement-breakpoint
CREATE TYPE "club_member_status" AS ENUM('active', 'invited', 'requested');--> statement-breakpoint
CREATE TYPE "club_visibility" AS ENUM('public', 'invite_only', 'private');--> statement-breakpoint
CREATE TABLE "club" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL UNIQUE,
	"description" text,
	"visibility" "club_visibility" DEFAULT 'public'::"club_visibility" NOT NULL,
	"invite_code" text NOT NULL UNIQUE
);
--> statement-breakpoint
CREATE TABLE "club_membership" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"club_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "club_member_role" DEFAULT 'member'::"club_member_role" NOT NULL,
	"status" "club_member_status" DEFAULT 'active'::"club_member_status" NOT NULL
);
--> statement-breakpoint
CREATE INDEX "club_visibility_idx" ON "club" ("visibility");--> statement-breakpoint
CREATE INDEX "club_name_idx" ON "club" ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "club_membership_club_user_uidx" ON "club_membership" ("club_id","user_id");--> statement-breakpoint
CREATE INDEX "club_membership_user_status_idx" ON "club_membership" ("user_id","status");--> statement-breakpoint
CREATE INDEX "club_membership_club_status_idx" ON "club_membership" ("club_id","status");--> statement-breakpoint
CREATE INDEX "club_membership_club_role_idx" ON "club_membership" ("club_id","role");--> statement-breakpoint
ALTER TABLE "club_membership" ADD CONSTRAINT "club_membership_club_id_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "club"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "club_membership" ADD CONSTRAINT "club_membership_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;