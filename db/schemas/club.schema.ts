import { index, pgEnum, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { user } from "@/db/schemas/auth.schema";
import { createdAt, id, updatedAt } from "@/db/utils";

export const clubVisibilityEnum = pgEnum("club_visibility", [
	"public",
	"invite_only",
	"private",
] as const);

export const clubMemberRoleEnum = pgEnum("club_member_role", [
	"admin",
	"moderator",
	"member",
] as const);

export const clubMemberStatusEnum = pgEnum("club_member_status", [
	"active",
	"invited",
	"requested",
] as const);

export const club = pgTable(
	"club",
	{
		id,
		createdAt,
		updatedAt,

		name: text("name").notNull(),
		slug: text("slug").notNull().unique(),
		description: text("description"),
		visibility: clubVisibilityEnum("visibility").default("public").notNull(),
		/** Opaque code for shareable join links (`/join/[inviteCode]`). */
		inviteCode: text("invite_code").notNull().unique(),
	},
	(table) => [
		index("club_visibility_idx").on(table.visibility),
		index("club_name_idx").on(table.name),
	],
);

export const clubMembership = pgTable(
	"club_membership",
	{
		id,
		createdAt,
		updatedAt,

		clubId: uuid("club_id")
			.notNull()
			.references(() => club.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		role: clubMemberRoleEnum("role").default("member").notNull(),
		status: clubMemberStatusEnum("status").default("active").notNull(),
	},
	(table) => [
		uniqueIndex("club_membership_club_user_uidx").on(table.clubId, table.userId),
		index("club_membership_user_status_idx").on(table.userId, table.status),
		index("club_membership_club_status_idx").on(table.clubId, table.status),
		index("club_membership_club_role_idx").on(table.clubId, table.role),
	],
);
