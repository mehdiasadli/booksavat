import type { AnyPgColumn } from "drizzle-orm/pg-core";
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
import { readingSession } from "@/db/schemas/club-session.schema";
import { createdAt, id, updatedAt } from "@/db/utils";

export const clubPostTypeEnum = pgEnum("club_post_type", [
	"discussion",
	"announcement",
	"system",
] as const);

export const clubPostAttachmentKindEnum = pgEnum("club_post_attachment_kind", [
	"work",
	"edition",
] as const);

export const clubPost = pgTable(
	"club_post",
	{
		id,
		createdAt,
		updatedAt,

		clubId: uuid("club_id")
			.notNull()
			.references(() => club.id, { onDelete: "cascade" }),
		authorUserId: uuid("author_user_id").references(() => user.id, { onDelete: "set null" }),
		type: clubPostTypeEnum("type").default("discussion").notNull(),
		title: text("title").notNull(),
		slug: text("slug").notNull(),
		body: jsonb("body").$type<Record<string, unknown>>(),
		canPeopleComment: boolean("can_people_comment").default(true).notNull(),
		canPeopleReact: boolean("can_people_react").default(true).notNull(),
		pinnedAt: timestamp("pinned_at"),
		deletedAt: timestamp("deleted_at"),
		relatedSessionId: uuid("related_session_id").references(() => readingSession.id, {
			onDelete: "set null",
		}),
		/** Idempotency key for system lifecycle posts, e.g. `voting`, `completed`. */
		systemEventKey: text("system_event_key"),
		reactionCount: integer("reaction_count").default(0).notNull(),
		commentCount: integer("comment_count").default(0).notNull(),
		replyCount: integer("reply_count").default(0).notNull(),
	},
	(table) => [
		unique("club_post_club_slug_uidx").on(table.clubId, table.slug),
		uniqueIndex("club_post_session_event_uidx").on(
			table.clubId,
			table.relatedSessionId,
			table.systemEventKey,
		),
		index("club_post_club_created_idx").on(table.clubId, table.createdAt),
		index("club_post_club_pinned_idx").on(table.clubId, table.pinnedAt),
		index("club_post_author_idx").on(table.authorUserId),
		index("club_post_related_session_idx").on(table.relatedSessionId),
	],
);

export const clubPostAttachment = pgTable(
	"club_post_attachment",
	{
		id,
		createdAt,
		updatedAt,

		postId: uuid("post_id")
			.notNull()
			.references(() => clubPost.id, { onDelete: "cascade" }),
		kind: clubPostAttachmentKindEnum("kind").notNull(),
		workId: text("work_id"),
		editionId: text("edition_id"),
	},
	(table) => [
		index("club_post_attachment_post_id_idx").on(table.postId),
		uniqueIndex("club_post_attachment_work_uidx").on(table.postId, table.workId),
		uniqueIndex("club_post_attachment_edition_uidx").on(table.postId, table.editionId),
	],
);

export const clubPostComment = pgTable(
	"club_post_comment",
	{
		id,
		createdAt,
		updatedAt,

		postId: uuid("post_id")
			.notNull()
			.references(() => clubPost.id, { onDelete: "cascade" }),
		authorUserId: uuid("author_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		parentId: uuid("parent_id").references((): AnyPgColumn => clubPostComment.id, {
			onDelete: "cascade",
		}),
		depth: integer("depth").default(0).notNull(),
		body: jsonb("body").$type<Record<string, unknown>>().notNull(),
		deletedAt: timestamp("deleted_at"),
	},
	(table) => [
		index("club_post_comment_post_id_idx").on(table.postId),
		index("club_post_comment_parent_id_idx").on(table.parentId),
		index("club_post_comment_author_id_idx").on(table.authorUserId),
	],
);

export const clubPostReaction = pgTable(
	"club_post_reaction",
	{
		id,
		createdAt,
		updatedAt,

		postId: uuid("post_id")
			.notNull()
			.references(() => clubPost.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		emoji: text("emoji").notNull(),
	},
	(table) => [
		unique("club_post_reaction_post_user_uidx").on(table.postId, table.userId),
		index("club_post_reaction_post_id_idx").on(table.postId),
		index("club_post_reaction_user_id_idx").on(table.userId),
	],
);

export const clubPostCommentReaction = pgTable(
	"club_post_comment_reaction",
	{
		id,
		createdAt,
		updatedAt,

		commentId: uuid("comment_id")
			.notNull()
			.references(() => clubPostComment.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		emoji: text("emoji").notNull(),
	},
	(table) => [
		unique("club_post_comment_reaction_comment_user_uidx").on(table.commentId, table.userId),
		index("club_post_comment_reaction_comment_id_idx").on(table.commentId),
		index("club_post_comment_reaction_user_id_idx").on(table.userId),
	],
);
