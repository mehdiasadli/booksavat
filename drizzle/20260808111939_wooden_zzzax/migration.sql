CREATE TABLE "club_booklist_document" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"booklist_item_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"file_name" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"page_count" integer NOT NULL,
	"language" text NOT NULL,
	"uploaded_by_user_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "club" ADD COLUMN "mods_can_upload_pdf" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "club" ADD COLUMN "members_can_upload_pdf" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "club_booklist_document_storage_key_uidx" ON "club_booklist_document" ("storage_key");--> statement-breakpoint
CREATE INDEX "club_booklist_document_item_idx" ON "club_booklist_document" ("booklist_item_id");--> statement-breakpoint
CREATE INDEX "club_booklist_document_uploaded_by_idx" ON "club_booklist_document" ("uploaded_by_user_id");--> statement-breakpoint
ALTER TABLE "club_booklist_document" ADD CONSTRAINT "club_booklist_document_2NQst4NhLXtH_fkey" FOREIGN KEY ("booklist_item_id") REFERENCES "club_booklist_item"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "club_booklist_document" ADD CONSTRAINT "club_booklist_document_uploaded_by_user_id_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "user"("id") ON DELETE CASCADE;