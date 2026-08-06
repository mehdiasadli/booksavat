import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	unique,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { user } from "@/db/schemas/auth.schema";
import { club } from "@/db/schemas/club.schema";
import { createdAt, id, updatedAt } from "@/db/utils";

type VoteChipsByRoleColumn = {
	admin: number[];
	moderator: number[];
	member: number[];
};

export const readingSessionStatusEnum = pgEnum("reading_session_status", [
	"proposed",
	"voting",
	"pending",
	"reading",
	"reviewing",
	"completed",
	"cancelled",
	"abandoned",
] as const);

export const readingSession = pgTable(
	"reading_session",
	{
		id,
		createdAt,
		updatedAt,

		clubId: uuid("club_id")
			.notNull()
			.references(() => club.id, { onDelete: "cascade" }),
		createdByUserId: uuid("created_by_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		status: readingSessionStatusEnum("status").default("proposed").notNull(),
		title: text("title"),
		joinDeadline: timestamp("join_deadline").notNull(),
		readingDeadline: timestamp("reading_deadline"),
		/** Chosen work after voting / admin pick; set when entering `pending`. */
		selectedWorkId: text("selected_work_id"),
		/** Snapshot of club chip defaults when entering `voting`. */
		voteChipsByRole: jsonb("vote_chips_by_role").$type<VoteChipsByRoleColumn | null>(),
	},
	(table) => [
		index("reading_session_club_id_idx").on(table.clubId),
		index("reading_session_club_status_idx").on(table.clubId, table.status),
		uniqueIndex("reading_session_one_live_per_club_uidx")
			.on(table.clubId)
			.where(sql`${table.status} in ('proposed', 'voting', 'pending', 'reading', 'reviewing')`),
	],
);

export const sessionParticipant = pgTable(
	"session_participant",
	{
		id,
		createdAt,
		updatedAt,

		sessionId: uuid("session_id")
			.notNull()
			.references(() => readingSession.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		joinedAt: timestamp("joined_at").defaultNow().notNull(),
		voteBlocked: boolean("vote_blocked").default(false).notNull(),
	},
	(table) => [
		unique("session_participant_session_user_uidx").on(table.sessionId, table.userId),
		index("session_participant_user_id_idx").on(table.userId),
		index("session_participant_session_id_idx").on(table.sessionId),
	],
);

export const sessionShortlistItem = pgTable(
	"session_shortlist_item",
	{
		id,
		createdAt,
		updatedAt,

		sessionId: uuid("session_id")
			.notNull()
			.references(() => readingSession.id, { onDelete: "cascade" }),
		workId: text("work_id").notNull(),
		addedByUserId: uuid("added_by_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [
		unique("session_shortlist_session_work_uidx").on(table.sessionId, table.workId),
		index("session_shortlist_session_id_idx").on(table.sessionId),
		index("session_shortlist_work_id_idx").on(table.workId),
	],
);

export const sessionVoteAssignment = pgTable(
	"session_vote_assignment",
	{
		id,
		createdAt,
		updatedAt,

		sessionId: uuid("session_id")
			.notNull()
			.references(() => readingSession.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		points: integer("points").notNull(),
		workId: text("work_id").notNull(),
	},
	(table) => [
		unique("session_vote_session_user_points_uidx").on(table.sessionId, table.userId, table.points),
		unique("session_vote_session_user_work_uidx").on(table.sessionId, table.userId, table.workId),
		index("session_vote_session_id_idx").on(table.sessionId),
		index("session_vote_user_id_idx").on(table.userId),
	],
);
