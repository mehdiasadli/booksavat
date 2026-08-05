CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"user_id" uuid NOT NULL,
	"work_id" text NOT NULL,
	"rating" numeric(2,1) NOT NULL,
	"review" jsonb
);
--> statement-breakpoint
CREATE UNIQUE INDEX "feedback_user_work_uidx" ON "feedback" ("user_id","work_id");--> statement-breakpoint
CREATE INDEX "feedback_work_id_idx" ON "feedback" ("work_id");--> statement-breakpoint
CREATE INDEX "feedback_user_id_idx" ON "feedback" ("user_id");--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;