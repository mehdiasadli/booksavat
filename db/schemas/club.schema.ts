import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	unique,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { user } from "@/db/schemas/auth.schema";
import { createdAt, id, updatedAt } from "@/db/utils";

type VoteChipsByRoleColumn = {
	admin: number[];
	moderator: number[];
	member: number[];
};

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

export const clubBooklistItemStatusEnum = pgEnum("club_booklist_item_status", [
	"active",
	"proposed",
] as const);

export const clubShortlistModeEnum = pgEnum("club_shortlist_mode", ["manual", "random"] as const);

export const clubCanPostEnum = pgEnum("club_can_post", [
	"all_members",
	"moderators",
	"admin_only",
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
		avatarUrl: text("avatar_url"),
		coverUrl: text("cover_url"),
		visibility: clubVisibilityEnum("visibility").default("public").notNull(),
		/** Opaque code for shareable join links (`/join/[inviteCode]`). */
		inviteCode: text("invite_code").notNull().unique(),

		/** Booklist permissions — admin always bypasses these. */
		modsCanAdd: boolean("mods_can_add").default(true).notNull(),
		membersCanAdd: boolean("members_can_add").default(false).notNull(),
		modsCanRemove: boolean("mods_can_remove").default(false).notNull(),
		membersCanRemove: boolean("members_can_remove").default(false).notNull(),
		modsCanPropose: boolean("mods_can_propose").default(true).notNull(),
		membersCanPropose: boolean("members_can_propose").default(true).notNull(),

		shortlistMode: clubShortlistModeEnum("shortlist_mode").default("manual").notNull(),
		defaultShortlistSize: integer("default_shortlist_size").default(10).notNull(),
		voteChipsByRole: jsonb("vote_chips_by_role")
			.$type<VoteChipsByRoleColumn>()
			.notNull()
			.default(sql`'{"admin":[1,2,3],"moderator":[1,2,3],"member":[1,2,3]}'::jsonb`),

		/** Community feed settings. */
		communityEnabled: boolean("community_enabled").default(true).notNull(),
		canPost: clubCanPostEnum("can_post").default("all_members").notNull(),
		defaultCanPeopleComment: boolean("default_can_people_comment").default(true).notNull(),
		defaultCanPeopleReact: boolean("default_can_people_react").default(true).notNull(),
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

export const clubBooklistItem = pgTable(
	"club_booklist_item",
	{
		id,
		createdAt,
		updatedAt,

		clubId: uuid("club_id")
			.notNull()
			.references(() => club.id, { onDelete: "cascade" }),
		/** Open Library work OLID, e.g. `OL45804W`. */
		workId: text("work_id").notNull(),
		addedByUserId: uuid("added_by_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		status: clubBooklistItemStatusEnum("status").default("active").notNull(),
	},
	(table) => [
		unique("club_booklist_item_club_work_uidx").on(table.clubId, table.workId),
		index("club_booklist_item_club_status_idx").on(table.clubId, table.status),
		index("club_booklist_item_work_id_idx").on(table.workId),
		index("club_booklist_item_added_by_idx").on(table.addedByUserId),
	],
);
