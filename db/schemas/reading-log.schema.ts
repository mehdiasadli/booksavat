import { boolean, index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { user } from "@/db/schemas/auth.schema";
import { createdAt, id, updatedAt } from "@/db/utils";

export const readingLogStatusEnum = pgEnum("reading_log_status", [
	"reading",
	"completed",
	"dnf",
] as const);

export const readingLog = pgTable(
	"reading_log",
	{
		id,
		createdAt,
		updatedAt,

		userId: uuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		/** Open Library work OLID, e.g. `OL45804W`. */
		workId: text("work_id").notNull(),
		status: readingLogStatusEnum("status").notNull(),
		startedAt: timestamp("started_at"),
		finishedAt: timestamp("finished_at"),
		isReread: boolean("is_reread").default(false).notNull(),
	},
	(table) => [
		index("reading_log_user_work_idx").on(table.userId, table.workId),
		index("reading_log_user_finished_at_idx").on(table.userId, table.finishedAt),
		index("reading_log_user_created_at_idx").on(table.userId, table.createdAt),
	],
);
