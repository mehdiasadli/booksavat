import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	unique,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { user } from "@/db/schemas/auth.schema";
import { createdAt, id, updatedAt } from "@/db/utils";

export const shelfVisibilityEnum = pgEnum("shelf_visibility", [
	"private",
	"followers_only",
	"public",
] as const);

export const shelfSystemKeyEnum = pgEnum("shelf_system_key", [
	"wishlist",
	"reading",
	"completed",
	"dnf",
] as const);

export const shelf = pgTable(
	"shelf",
	{
		id,
		createdAt,
		updatedAt,

		userId: uuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		slug: text("slug").notNull(),
		description: text("description"),
		visibility: shelfVisibilityEnum("visibility").default("private").notNull(),
		isSystem: boolean("is_system").default(false).notNull(),
		systemKey: shelfSystemKeyEnum("system_key"),
		isOrdered: boolean("is_ordered").default(false).notNull(),
		position: integer("position").notNull().default(0),
	},
	(table) => [
		unique("shelf_user_slug_uidx").on(table.userId, table.slug),
		uniqueIndex("shelf_user_system_key_uidx")
			.on(table.userId, table.systemKey)
			.where(sql`${table.systemKey} is not null`),
		index("shelf_user_id_idx").on(table.userId),
		index("shelf_user_position_idx").on(table.userId, table.position),
	],
);

export const shelfItem = pgTable(
	"shelf_item",
	{
		id,
		createdAt,
		updatedAt,

		shelfId: uuid("shelf_id")
			.notNull()
			.references(() => shelf.id, { onDelete: "cascade" }),
		/** Open Library work OLID, e.g. `OL45804W`. */
		workId: text("work_id").notNull(),
		position: integer("position").notNull().default(0),
	},
	(table) => [
		unique("shelf_item_shelf_work_uidx").on(table.shelfId, table.workId),
		index("shelf_item_shelf_position_idx").on(table.shelfId, table.position),
		index("shelf_item_work_id_idx").on(table.workId),
	],
);
