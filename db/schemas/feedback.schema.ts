import { index, jsonb, numeric, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { user } from "@/db/schemas/auth.schema";
import { createdAt, id, updatedAt } from "@/db/utils";

/**
 * One feedback per user per work (shared across re-reads).
 * `review` stores TipTap/ProseMirror JSON — never raw HTML from the client.
 */
export const feedback = pgTable(
	"feedback",
	{
		id,
		createdAt,
		updatedAt,

		userId: uuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		/** Open Library work OLID, e.g. `OL45804W`. */
		workId: text("work_id").notNull(),
		/** Half-star scale: 0, 0.5, …, 5.0 */
		rating: numeric("rating", { precision: 2, scale: 1 }).notNull(),
		/** TipTap JSON document, or null when rating-only. */
		review: jsonb("review").$type<Record<string, unknown> | null>(),
	},
	(table) => [
		uniqueIndex("feedback_user_work_uidx").on(table.userId, table.workId),
		index("feedback_work_id_idx").on(table.workId),
		index("feedback_user_id_idx").on(table.userId),
	],
);
