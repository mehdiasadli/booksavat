CREATE TYPE "club_booklist_item_status" AS ENUM('active', 'proposed');--> statement-breakpoint
CREATE TYPE "club_shortlist_mode" AS ENUM('manual', 'random');--> statement-breakpoint
CREATE TABLE "club_booklist_item" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"club_id" uuid NOT NULL,
	"work_id" text NOT NULL,
	"added_by_user_id" uuid NOT NULL,
	"status" "club_booklist_item_status" DEFAULT 'active'::"club_booklist_item_status" NOT NULL,
	CONSTRAINT "club_booklist_item_club_work_uidx" UNIQUE("club_id","work_id")
);
--> statement-breakpoint
ALTER TABLE "club" ADD COLUMN "mods_can_add" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "club" ADD COLUMN "members_can_add" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "club" ADD COLUMN "mods_can_remove" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "club" ADD COLUMN "members_can_remove" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "club" ADD COLUMN "mods_can_propose" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "club" ADD COLUMN "members_can_propose" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "club" ADD COLUMN "shortlist_mode" "club_shortlist_mode" DEFAULT 'manual'::"club_shortlist_mode" NOT NULL;--> statement-breakpoint
ALTER TABLE "club" ADD COLUMN "default_shortlist_size" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
CREATE INDEX "club_booklist_item_club_status_idx" ON "club_booklist_item" ("club_id","status");--> statement-breakpoint
CREATE INDEX "club_booklist_item_work_id_idx" ON "club_booklist_item" ("work_id");--> statement-breakpoint
CREATE INDEX "club_booklist_item_added_by_idx" ON "club_booklist_item" ("added_by_user_id");--> statement-breakpoint
ALTER TABLE "club_booklist_item" ADD CONSTRAINT "club_booklist_item_club_id_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "club"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "club_booklist_item" ADD CONSTRAINT "club_booklist_item_added_by_user_id_user_id_fkey" FOREIGN KEY ("added_by_user_id") REFERENCES "user"("id") ON DELETE CASCADE;