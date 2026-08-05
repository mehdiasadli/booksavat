import { index, pgEnum, pgTable, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { user } from "@/db/schemas/auth.schema";
import { createdAt, id, updatedAt } from "@/db/utils";

export const followStatusEnum = pgEnum("follow_status", ["pending", "accepted"] as const);

/**
 * Directed follow edge.
 * Public accounts accept immediately (`accepted`); private accounts start as `pending`.
 */
export const follow = pgTable(
	"follow",
	{
		id,
		createdAt,
		updatedAt,

		followerId: uuid("follower_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		followingId: uuid("following_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		status: followStatusEnum("status").default("pending").notNull(),
	},
	(table) => [
		uniqueIndex("follow_follower_following_uidx").on(table.followerId, table.followingId),
		index("follow_following_status_idx").on(table.followingId, table.status),
		index("follow_follower_status_idx").on(table.followerId, table.status),
	],
);
