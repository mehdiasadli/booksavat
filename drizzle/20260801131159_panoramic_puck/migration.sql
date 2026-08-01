CREATE TYPE "shelf_system_key" AS ENUM('wishlist', 'reading', 'completed', 'dnf');--> statement-breakpoint
CREATE TYPE "shelf_visibility" AS ENUM('private', 'followers_only', 'public');--> statement-breakpoint
CREATE TABLE "shelf" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"visibility" "shelf_visibility" DEFAULT 'private'::"shelf_visibility" NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"system_key" "shelf_system_key",
	"is_ordered" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "shelf_user_slug_uidx" UNIQUE("user_id","slug")
);
--> statement-breakpoint
CREATE TABLE "shelf_item" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"shelf_id" uuid NOT NULL,
	"work_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "shelf_item_shelf_work_uidx" UNIQUE("shelf_id","work_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "shelf_user_system_key_uidx" ON "shelf" ("user_id","system_key") WHERE "system_key" is not null;--> statement-breakpoint
CREATE INDEX "shelf_user_id_idx" ON "shelf" ("user_id");--> statement-breakpoint
CREATE INDEX "shelf_user_position_idx" ON "shelf" ("user_id","position");--> statement-breakpoint
CREATE INDEX "shelf_item_shelf_position_idx" ON "shelf_item" ("shelf_id","position");--> statement-breakpoint
CREATE INDEX "shelf_item_work_id_idx" ON "shelf_item" ("work_id");--> statement-breakpoint
ALTER TABLE "shelf" ADD CONSTRAINT "shelf_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "shelf_item" ADD CONSTRAINT "shelf_item_shelf_id_shelf_id_fkey" FOREIGN KEY ("shelf_id") REFERENCES "shelf"("id") ON DELETE CASCADE;--> statement-breakpoint
-- Backfill system shelves for every existing user (idempotent).
INSERT INTO "shelf" ("updated_at", "user_id", "name", "slug", "visibility", "is_system", "system_key", "is_ordered", "position")
SELECT now(), u."id", v."name", v."slug", 'private'::"shelf_visibility", true, v."system_key"::"shelf_system_key", false, v."position"
FROM "user" u
CROSS JOIN (
	VALUES
		('Wishlist', 'wishlist', 'wishlist', 0),
		('Reading', 'reading', 'reading', 1),
		('Completed', 'completed', 'completed', 2),
		('DNF', 'dnf', 'dnf', 3)
) AS v("name", "slug", "system_key", "position")
WHERE NOT EXISTS (
	SELECT 1
	FROM "shelf" s
	WHERE s."user_id" = u."id"
		AND s."system_key" = v."system_key"::"shelf_system_key"
);