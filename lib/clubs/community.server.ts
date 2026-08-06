import "server-only";

import { and, asc, desc, eq, gte, inArray, isNotNull, isNull } from "drizzle-orm";

import type { Database } from "@/db";
import {
	club,
	clubMembership,
	clubPost,
	clubPostAttachment,
	clubPostComment,
	clubPostCommentReaction,
	clubPostReaction,
	user,
} from "@/db/schema";
import { coverUrlFromCoverId } from "@/lib/books/covers";
import {
	type ClubCommunitySettings,
	type ClubPostType,
	COMMUNITY_COMMENT_BODY_PLAIN_MAX,
	COMMUNITY_COMMENT_MAX_DEPTH,
	COMMUNITY_FEED_PAGE_SIZE,
	COMMUNITY_MAX_ATTACHMENTS,
	COMMUNITY_POST_BODY_PLAIN_MAX,
	COMMUNITY_POST_SLUG_MAX,
	COMMUNITY_POST_TITLE_MAX,
	canAnnounce,
	canCreateCommunityPost,
	canModerateCommunity,
	decodeCommunityCursor,
	encodeCommunityCursor,
	isActiveMember,
	nextCommentDepth,
} from "@/lib/clubs/community";
import {
	type CommunityFeedSort,
	type CommunityTopRange,
	engagementScore,
	hotScore,
	topRangeStart,
	truncateSlug,
} from "@/lib/clubs/community-ranking";
import { buildDiscussionTree, type DiscussionMessageNode } from "@/lib/clubs/session-discussion";
import type { ViewerMembership } from "@/lib/clubs/visibility";
import { canViewClubContent } from "@/lib/clubs/visibility";
import { isReactionEmoji, REACTION_EMOJIS, type ReactionEmoji } from "@/lib/reactions";
import {
	isRichTextEmpty,
	type RichTextDocument,
	richTextPlainText,
	sanitizeRichTextDocument,
} from "@/lib/rich-text/document";
import { generateUniqueSlug, slugify } from "@/lib/slugify";
import { olib } from "@/olib";

type ServiceError = {
	ok: false;
	code: "not_found" | "forbidden" | "conflict" | "bad_request";
	message: string;
};
type ServiceOk<T> = { ok: true; data: T };
type ServiceResult<T> = ServiceOk<T> | ServiceError;

function fail(code: ServiceError["code"], message: string): ServiceError {
	return { ok: false, code, message };
}

function ok<T>(data: T): ServiceOk<T> {
	return { ok: true, data };
}

export type CommunityAuthorDto = {
	id: string;
	username: string;
	name: string;
	image: string | null;
	role: "admin" | "moderator" | "member" | null;
};

export type CommunityReactionDto = {
	emoji: ReactionEmoji;
	count: number;
	reactedByViewer: boolean;
};

export type CommunityAttachmentDto = {
	id: string;
	kind: "work" | "edition";
	workId: string | null;
	editionId: string | null;
	title: string;
	coverUrl: string | null;
};

export type CommunityPostSummaryDto = {
	id: string;
	clubId: string;
	type: ClubPostType;
	title: string;
	slug: string;
	body: RichTextDocument | null;
	canPeopleComment: boolean;
	canPeopleReact: boolean;
	pinnedAt: Date | null;
	deletedAt: Date | null;
	relatedSessionId: string | null;
	reactionCount: number;
	commentCount: number;
	replyCount: number;
	createdAt: Date;
	updatedAt: Date;
	author: CommunityAuthorDto | null;
	attachments: CommunityAttachmentDto[];
	reactions: CommunityReactionDto[];
	engagement: number;
	hotScore: number;
	canEdit: boolean;
	canDelete: boolean;
	canPin: boolean;
	canComment: boolean;
	canReact: boolean;
};

export type CommunityCommentDto = {
	id: string;
	postId: string;
	parentId: string | null;
	depth: number;
	body: RichTextDocument | null;
	deletedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
	author: CommunityAuthorDto;
	reactions: CommunityReactionDto[];
	canDelete: boolean;
	canReply: boolean;
	canReact: boolean;
	replies: CommunityCommentDto[];
};

export type CommunityPostDetailDto = CommunityPostSummaryDto & {
	comments: CommunityCommentDto[];
	maxDepth: number;
	reactionEmojis: string[];
};

export type CommunityFeedPage = {
	items: CommunityPostSummaryDto[];
	nextCursor: string | null;
	communityEnabled: boolean;
	canPost: boolean;
	canAnnounce: boolean;
	canModerate: boolean;
	settings: ClubCommunitySettings;
};

type ClubRow = typeof club.$inferSelect;
type PostRow = typeof clubPost.$inferSelect;

async function getMembership(
	db: Database,
	clubId: string,
	userId: string | null | undefined,
): Promise<ViewerMembership> {
	if (!userId) return null;
	const [row] = await db
		.select({ role: clubMembership.role, status: clubMembership.status })
		.from(clubMembership)
		.where(and(eq(clubMembership.clubId, clubId), eq(clubMembership.userId, userId)))
		.limit(1);
	return row ?? null;
}

async function requireClubBySlug(db: Database, slug: string) {
	const [row] = await db.select().from(club).where(eq(club.slug, slug)).limit(1);
	return row ?? null;
}

function communitySettingsFromClub(row: ClubRow): ClubCommunitySettings {
	return {
		communityEnabled: row.communityEnabled,
		canPost: row.canPost,
		defaultCanPeopleComment: row.defaultCanPeopleComment,
		defaultCanPeopleReact: row.defaultCanPeopleReact,
	};
}

function sanitizeOptionalBody(
	raw: unknown,
	maxPlain: number,
): ServiceResult<RichTextDocument | null> {
	if (raw == null) return ok(null);
	const sanitized = sanitizeRichTextDocument(raw);
	if (!sanitized.ok) return fail("bad_request", sanitized.error);
	if (isRichTextEmpty(sanitized.document)) return ok(null);
	const plain = richTextPlainText(sanitized.document);
	if (plain.length > maxPlain) {
		return fail("bad_request", `Body is too long (max ${maxPlain} characters)`);
	}
	return ok(sanitized.document);
}

function sanitizeRequiredBody(raw: unknown, maxPlain: number): ServiceResult<RichTextDocument> {
	const sanitized = sanitizeRichTextDocument(raw);
	if (!sanitized.ok) return fail("bad_request", sanitized.error);
	if (isRichTextEmpty(sanitized.document)) {
		return fail("bad_request", "Comment cannot be empty");
	}
	const plain = richTextPlainText(sanitized.document);
	if (plain.length > maxPlain) {
		return fail("bad_request", `Comment is too long (max ${maxPlain} characters)`);
	}
	return ok(sanitized.document);
}

async function hydrateWork(workId: string): Promise<{ title: string; coverUrl: string | null }> {
	try {
		const work = await olib.works.get(workId);
		return {
			title: work.title?.trim() || "Untitled",
			coverUrl: coverUrlFromCoverId(work.covers?.[0], "M"),
		};
	} catch {
		return { title: "Unknown work", coverUrl: null };
	}
}

async function hydrateEdition(
	editionId: string,
): Promise<{ title: string; coverUrl: string | null; workId: string | null }> {
	try {
		const edition = await olib.editions.get(editionId);
		const workKey = edition.works?.[0]?.key?.replace("/works/", "") ?? null;
		return {
			title: edition.title?.trim() || "Untitled edition",
			coverUrl: coverUrlFromCoverId(edition.covers?.[0], "M"),
			workId: workKey,
		};
	} catch {
		return { title: "Unknown edition", coverUrl: null, workId: null };
	}
}

async function loadAuthorMap(
	db: Database,
	clubId: string,
	userIds: string[],
): Promise<Map<string, CommunityAuthorDto>> {
	const unique = [...new Set(userIds.filter(Boolean))];
	if (unique.length === 0) return new Map();

	const [users, memberships] = await Promise.all([
		db
			.select({
				id: user.id,
				username: user.username,
				name: user.name,
				image: user.image,
			})
			.from(user)
			.where(inArray(user.id, unique)),
		db
			.select({
				userId: clubMembership.userId,
				role: clubMembership.role,
			})
			.from(clubMembership)
			.where(
				and(
					eq(clubMembership.clubId, clubId),
					eq(clubMembership.status, "active"),
					inArray(clubMembership.userId, unique),
				),
			),
	]);

	const roleByUser = new Map(memberships.map((m) => [m.userId, m.role]));
	return new Map(
		users.map((u) => [
			u.id,
			{
				id: u.id,
				username: u.username,
				name: u.name,
				image: u.image,
				role: roleByUser.get(u.id) ?? null,
			},
		]),
	);
}

async function loadAttachments(
	db: Database,
	postIds: string[],
): Promise<Map<string, CommunityAttachmentDto[]>> {
	const map = new Map<string, CommunityAttachmentDto[]>();
	if (postIds.length === 0) return map;

	const rows = await db
		.select()
		.from(clubPostAttachment)
		.where(inArray(clubPostAttachment.postId, postIds));

	for (const row of rows) {
		let title = "Attachment";
		let coverUrl: string | null = null;
		if (row.kind === "work" && row.workId) {
			const preview = await hydrateWork(row.workId);
			title = preview.title;
			coverUrl = preview.coverUrl;
		} else if (row.kind === "edition" && row.editionId) {
			const preview = await hydrateEdition(row.editionId);
			title = preview.title;
			coverUrl = preview.coverUrl;
		}

		const list = map.get(row.postId) ?? [];
		list.push({
			id: row.id,
			kind: row.kind,
			workId: row.workId,
			editionId: row.editionId,
			title,
			coverUrl,
		});
		map.set(row.postId, list);
	}
	return map;
}

function aggregateReactions(
	rows: Array<{ emoji: string; userId: string }>,
	viewerUserId: string | null | undefined,
): CommunityReactionDto[] {
	const counts = new Map<ReactionEmoji, { count: number; reactedByViewer: boolean }>();
	for (const emoji of REACTION_EMOJIS) {
		counts.set(emoji, { count: 0, reactedByViewer: false });
	}
	for (const row of rows) {
		if (!isReactionEmoji(row.emoji)) continue;
		const entry = counts.get(row.emoji);
		if (!entry) continue;
		entry.count += 1;
		if (viewerUserId && row.userId === viewerUserId) {
			entry.reactedByViewer = true;
		}
	}
	return REACTION_EMOJIS.map((emoji) => {
		const entry = counts.get(emoji) ?? { count: 0, reactedByViewer: false };
		return {
			emoji,
			count: entry.count,
			reactedByViewer: entry.reactedByViewer,
		};
	}).filter((reaction) => reaction.count > 0 || reaction.reactedByViewer);
}

async function loadPostReactions(
	db: Database,
	postIds: string[],
	viewerUserId: string | null | undefined,
): Promise<Map<string, CommunityReactionDto[]>> {
	const map = new Map<string, CommunityReactionDto[]>();
	if (postIds.length === 0) return map;

	const rows = await db
		.select()
		.from(clubPostReaction)
		.where(inArray(clubPostReaction.postId, postIds));

	const byPost = new Map<string, typeof rows>();
	for (const row of rows) {
		const list = byPost.get(row.postId) ?? [];
		list.push(row);
		byPost.set(row.postId, list);
	}

	for (const postId of postIds) {
		map.set(postId, aggregateReactions(byPost.get(postId) ?? [], viewerUserId));
	}
	return map;
}

function toPostSummary(
	row: PostRow,
	author: CommunityAuthorDto | null,
	attachments: CommunityAttachmentDto[],
	reactions: CommunityReactionDto[],
	caps: {
		viewerUserId: string | null | undefined;
		membership: ViewerMembership;
		canComment: boolean;
		canReact: boolean;
	},
	now = new Date(),
): CommunityPostSummaryDto {
	const engagement = engagementScore({
		reactionCount: row.reactionCount,
		commentCount: row.commentCount,
		replyCount: row.replyCount,
	});
	const isAuthor = Boolean(caps.viewerUserId && row.authorUserId === caps.viewerUserId);
	const moderate = canModerateCommunity(caps.membership);

	return {
		id: row.id,
		clubId: row.clubId,
		type: row.type,
		title: row.deletedAt ? "[deleted]" : row.title,
		slug: row.slug,
		body: row.deletedAt ? null : ((row.body as RichTextDocument | null) ?? null),
		canPeopleComment: row.canPeopleComment,
		canPeopleReact: row.canPeopleReact,
		pinnedAt: row.pinnedAt,
		deletedAt: row.deletedAt,
		relatedSessionId: row.relatedSessionId,
		reactionCount: row.reactionCount,
		commentCount: row.commentCount,
		replyCount: row.replyCount,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		author: row.deletedAt ? null : author,
		attachments: row.deletedAt ? [] : attachments,
		reactions,
		engagement,
		hotScore: hotScore(
			{
				reactionCount: row.reactionCount,
				commentCount: row.commentCount,
				replyCount: row.replyCount,
			},
			row.createdAt,
			now,
		),
		canEdit: isAuthor && !row.deletedAt && row.type !== "system",
		canDelete: !row.deletedAt && (isAuthor || moderate),
		canPin: moderate && !row.deletedAt,
		canComment: caps.canComment && row.canPeopleComment && !row.deletedAt,
		canReact: caps.canReact && row.canPeopleReact && !row.deletedAt,
	};
}

async function mapPosts(
	db: Database,
	clubRow: ClubRow,
	rows: PostRow[],
	viewerUserId: string | null | undefined,
	membership: ViewerMembership,
): Promise<CommunityPostSummaryDto[]> {
	const authorIds = rows.map((r) => r.authorUserId).filter((id): id is string => Boolean(id));
	const postIds = rows.map((r) => r.id);
	const [authors, attachments, reactions] = await Promise.all([
		loadAuthorMap(db, clubRow.id, authorIds),
		loadAttachments(db, postIds),
		loadPostReactions(db, postIds, viewerUserId),
	]);

	const active = isActiveMember(membership);
	const canComment = active;
	const canReact = active;

	return rows.map((row) =>
		toPostSummary(
			row,
			row.authorUserId ? (authors.get(row.authorUserId) ?? null) : null,
			attachments.get(row.id) ?? [],
			reactions.get(row.id) ?? [],
			{ viewerUserId, membership, canComment, canReact },
		),
	);
}

async function uniquePostSlug(
	db: Database,
	clubId: string,
	title: string,
	excludePostId?: string,
): Promise<string> {
	const base = truncateSlug(slugify(title) || "post", COMMUNITY_POST_SLUG_MAX);
	return generateUniqueSlug(
		base,
		async (candidate) => {
			const [existing] = await db
				.select({ id: clubPost.id })
				.from(clubPost)
				.where(and(eq(clubPost.clubId, clubId), eq(clubPost.slug, candidate)))
				.limit(1);
			if (!existing) return false;
			if (excludePostId && existing.id === excludePostId) return false;
			return true;
		},
		{ slugify: false, maxAttempts: 20 },
	);
}

type AttachmentInput = { kind: "work"; workId: string } | { kind: "edition"; editionId: string };

async function replaceAttachments(
	db: Database,
	postId: string,
	attachments: AttachmentInput[] | undefined,
): Promise<ServiceResult<true>> {
	if (attachments === undefined) return ok(true);
	if (attachments.length > COMMUNITY_MAX_ATTACHMENTS) {
		return fail("bad_request", `At most ${COMMUNITY_MAX_ATTACHMENTS} attachments`);
	}

	const seen = new Set<string>();
	const values: {
		postId: string;
		kind: "work" | "edition";
		workId: string | null;
		editionId: string | null;
		createdAt: Date;
		updatedAt: Date;
	}[] = [];

	for (const item of attachments) {
		if (item.kind === "work") {
			const workId = item.workId.trim();
			if (!workId) return fail("bad_request", "Invalid work attachment");
			const key = `work:${workId}`;
			if (seen.has(key)) continue;
			seen.add(key);
			values.push({
				postId,
				kind: "work",
				workId,
				editionId: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		} else {
			const editionId = item.editionId.trim();
			if (!editionId) return fail("bad_request", "Invalid edition attachment");
			const key = `edition:${editionId}`;
			if (seen.has(key)) continue;
			seen.add(key);
			values.push({
				postId,
				kind: "edition",
				workId: null,
				editionId,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		}
	}

	await db.delete(clubPostAttachment).where(eq(clubPostAttachment.postId, postId));
	if (values.length > 0) {
		await db.insert(clubPostAttachment).values(values);
	}
	return ok(true);
}

export async function updateCommunitySettings(
	db: Database,
	viewerUserId: string,
	slug: string,
	input: Partial<ClubCommunitySettings>,
): Promise<ServiceResult<ClubCommunitySettings>> {
	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	if (membership?.status !== "active" || membership.role !== "admin") {
		return fail("forbidden", "Only the club admin can update community settings");
	}

	const [updated] = await db
		.update(club)
		.set({
			communityEnabled: input.communityEnabled ?? clubRow.communityEnabled,
			canPost: input.canPost ?? clubRow.canPost,
			defaultCanPeopleComment: input.defaultCanPeopleComment ?? clubRow.defaultCanPeopleComment,
			defaultCanPeopleReact: input.defaultCanPeopleReact ?? clubRow.defaultCanPeopleReact,
			updatedAt: new Date(),
		})
		.where(eq(club.id, clubRow.id))
		.returning();

	return ok(communitySettingsFromClub(updated));
}

export async function listCommunityFeed(
	db: Database,
	slug: string,
	viewerUserId: string | null | undefined,
	input: {
		sort?: CommunityFeedSort;
		topRange?: CommunityTopRange;
		type?: ClubPostType;
		authorRole?: "admin" | "moderator" | "member";
		pinnedOnly?: boolean;
		cursor?: string | null;
		limit?: number;
	},
): Promise<ServiceResult<CommunityFeedPage>> {
	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	if (!canViewClubContent({ visibility: clubRow.visibility, membership })) {
		return fail("forbidden", "You cannot view this club’s feed");
	}

	const settings = communitySettingsFromClub(clubRow);
	const sort = input.sort ?? "hot";
	const topRange = input.topRange ?? "all";
	const limit = Math.min(Math.max(input.limit ?? COMMUNITY_FEED_PAGE_SIZE, 1), 50);
	const cursor = input.cursor ? decodeCommunityCursor(input.cursor) : null;
	if (input.cursor && !cursor) {
		return fail("bad_request", "Invalid cursor");
	}
	if (cursor && cursor.sort !== sort) {
		return fail("bad_request", "Cursor sort does not match request");
	}

	const conditions = [eq(clubPost.clubId, clubRow.id), isNull(clubPost.deletedAt)];

	if (input.type) {
		conditions.push(eq(clubPost.type, input.type));
	}
	if (input.pinnedOnly) {
		conditions.push(isNotNull(clubPost.pinnedAt));
	}
	if (sort === "top") {
		const start = topRangeStart(topRange);
		if (start) {
			conditions.push(gte(clubPost.createdAt, start));
		}
	}

	let rows = await db
		.select()
		.from(clubPost)
		.where(and(...conditions))
		.orderBy(desc(clubPost.createdAt))
		.limit(500);

	if (input.authorRole) {
		const roleUserIds = await db
			.select({ userId: clubMembership.userId })
			.from(clubMembership)
			.where(
				and(
					eq(clubMembership.clubId, clubRow.id),
					eq(clubMembership.status, "active"),
					eq(clubMembership.role, input.authorRole),
				),
			);
		const allowed = new Set(roleUserIds.map((r) => r.userId));
		rows = rows.filter((r) => r.authorUserId && allowed.has(r.authorUserId));
	}

	const now = new Date();
	const ranked = rows
		.map((row) => {
			const engagement = engagementScore({
				reactionCount: row.reactionCount,
				commentCount: row.commentCount,
				replyCount: row.replyCount,
			});
			const score =
				sort === "new"
					? row.createdAt.getTime()
					: sort === "top"
						? engagement
						: hotScore(
								{
									reactionCount: row.reactionCount,
									commentCount: row.commentCount,
									replyCount: row.replyCount,
								},
								row.createdAt,
								now,
							);
			return { row, engagement, score, pinned: Boolean(row.pinnedAt) };
		})
		.sort((a, b) => {
			if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
			if (a.score !== b.score) return b.score - a.score;
			if (a.row.createdAt.getTime() !== b.row.createdAt.getTime()) {
				return b.row.createdAt.getTime() - a.row.createdAt.getTime();
			}
			return a.row.id < b.row.id ? 1 : -1;
		});

	let startIndex = 0;
	if (cursor) {
		const exact = ranked.findIndex(
			(item) =>
				item.row.id === cursor.id &&
				item.row.createdAt.toISOString() === cursor.createdAt &&
				item.pinned === cursor.pinned,
		);
		if (exact >= 0) {
			startIndex = exact + 1;
		} else {
			startIndex = ranked.findIndex((item) => {
				if (item.pinned !== cursor.pinned) {
					return !item.pinned && cursor.pinned;
				}
				if (item.score !== cursor.score) {
					return item.score < cursor.score;
				}
				const createdIso = item.row.createdAt.toISOString();
				if (createdIso !== cursor.createdAt) {
					return createdIso < cursor.createdAt;
				}
				return item.row.id < cursor.id;
			});
			if (startIndex < 0) startIndex = ranked.length;
		}
	}

	const pageRows = ranked.slice(startIndex, startIndex + limit);
	const items = await mapPosts(
		db,
		clubRow,
		pageRows.map((p) => p.row),
		viewerUserId,
		membership,
	);

	const last = pageRows[pageRows.length - 1];
	const nextCursor =
		last && startIndex + limit < ranked.length
			? encodeCommunityCursor({
					sort,
					pinned: last.pinned,
					score: last.score,
					createdAt: last.row.createdAt.toISOString(),
					id: last.row.id,
				})
			: null;

	return ok({
		items,
		nextCursor,
		communityEnabled: settings.communityEnabled,
		canPost: canCreateCommunityPost(membership, settings.canPost, "discussion"),
		canAnnounce: canAnnounce(membership),
		canModerate: canModerateCommunity(membership),
		settings,
	});
}

export async function getCommunityPost(
	db: Database,
	slug: string,
	postSlug: string,
	viewerUserId: string | null | undefined,
): Promise<ServiceResult<CommunityPostDetailDto>> {
	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	if (!canViewClubContent({ visibility: clubRow.visibility, membership })) {
		return fail("forbidden", "You cannot view this club’s posts");
	}

	const [row] = await db
		.select()
		.from(clubPost)
		.where(and(eq(clubPost.clubId, clubRow.id), eq(clubPost.slug, postSlug)))
		.limit(1);
	if (!row) return fail("not_found", "Post not found");

	const [summary] = await mapPosts(db, clubRow, [row], viewerUserId, membership);
	const comments = await loadCommentTree(db, clubRow, row, viewerUserId, membership);

	return ok({
		...summary,
		comments,
		maxDepth: COMMUNITY_COMMENT_MAX_DEPTH,
		reactionEmojis: [...REACTION_EMOJIS],
	});
}

async function loadCommentReactions(
	db: Database,
	commentIds: string[],
	viewerUserId: string | null | undefined,
): Promise<Map<string, CommunityReactionDto[]>> {
	const map = new Map<string, CommunityReactionDto[]>();
	if (commentIds.length === 0) return map;

	const rows = await db
		.select()
		.from(clubPostCommentReaction)
		.where(inArray(clubPostCommentReaction.commentId, commentIds));

	const byComment = new Map<string, typeof rows>();
	for (const row of rows) {
		const list = byComment.get(row.commentId) ?? [];
		list.push(row);
		byComment.set(row.commentId, list);
	}

	for (const commentId of commentIds) {
		map.set(commentId, aggregateReactions(byComment.get(commentId) ?? [], viewerUserId));
	}
	return map;
}

async function loadCommentTree(
	db: Database,
	clubRow: ClubRow,
	post: PostRow,
	viewerUserId: string | null | undefined,
	membership: ViewerMembership,
): Promise<CommunityCommentDto[]> {
	const rows = await db
		.select()
		.from(clubPostComment)
		.where(eq(clubPostComment.postId, post.id))
		.orderBy(asc(clubPostComment.createdAt));

	const authors = await loadAuthorMap(
		db,
		clubRow.id,
		rows.map((r) => r.authorUserId),
	);
	const reactions = await loadCommentReactions(
		db,
		rows.map((r) => r.id),
		viewerUserId,
	);

	const active = isActiveMember(membership);
	const moderate = canModerateCommunity(membership);
	const canReplyBase = active && post.canPeopleComment && !post.deletedAt;
	const canReactBase = active && post.canPeopleReact && !post.deletedAt;

	type Flat = {
		id: string;
		postId: string;
		parentId: string | null;
		depth: number;
		body: RichTextDocument | null;
		deletedAt: Date | null;
		createdAt: Date;
		updatedAt: Date;
		author: CommunityAuthorDto;
		reactions: CommunityReactionDto[];
		canDelete: boolean;
		canReply: boolean;
		canReact: boolean;
	};

	const flat: Flat[] = rows.map((row) => {
		const isAuthor = viewerUserId === row.authorUserId;
		const deleted = Boolean(row.deletedAt);
		return {
			id: row.id,
			postId: row.postId,
			parentId: row.parentId,
			depth: row.depth,
			body: deleted ? null : ((row.body as RichTextDocument) ?? null),
			deletedAt: row.deletedAt,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
			author: deleted
				? {
						id: row.authorUserId,
						username: "deleted",
						name: "[deleted]",
						image: null,
						role: null,
					}
				: (authors.get(row.authorUserId) ?? {
						id: row.authorUserId,
						username: "unknown",
						name: "Unknown",
						image: null,
						role: null,
					}),
			reactions: deleted ? [] : (reactions.get(row.id) ?? []),
			canDelete: !deleted && (isAuthor || moderate),
			canReply: canReplyBase && !deleted && row.depth < COMMUNITY_COMMENT_MAX_DEPTH,
			canReact: canReactBase && !deleted,
		};
	});

	const tree = buildDiscussionTree(flat);
	const mapNode = (node: DiscussionMessageNode<Flat>): CommunityCommentDto => ({
		...node,
		replies: node.replies.map(mapNode),
	});
	return tree.map(mapNode);
}

export async function createCommunityPost(
	db: Database,
	viewerUserId: string,
	slug: string,
	input: {
		title: string;
		body?: unknown;
		type?: Exclude<ClubPostType, "system">;
		canPeopleComment?: boolean;
		canPeopleReact?: boolean;
		attachments?: AttachmentInput[];
	},
): Promise<ServiceResult<CommunityPostDetailDto>> {
	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	const settings = communitySettingsFromClub(clubRow);
	if (!settings.communityEnabled) {
		return fail("forbidden", "Community is disabled for this club");
	}

	const type = input.type ?? "discussion";
	if (!canCreateCommunityPost(membership, settings.canPost, type)) {
		return fail("forbidden", "You cannot create this kind of post");
	}

	const title = input.title.trim();
	if (!title) return fail("bad_request", "Title is required");
	if (title.length > COMMUNITY_POST_TITLE_MAX) {
		return fail("bad_request", `Title is too long (max ${COMMUNITY_POST_TITLE_MAX})`);
	}

	const bodyResult = await Promise.resolve(
		sanitizeOptionalBody(input.body, COMMUNITY_POST_BODY_PLAIN_MAX),
	);
	if (!bodyResult.ok) return bodyResult;

	const postSlug = await uniquePostSlug(db, clubRow.id, title);
	const now = new Date();
	const [created] = await db
		.insert(clubPost)
		.values({
			clubId: clubRow.id,
			authorUserId: viewerUserId,
			type,
			title,
			slug: postSlug,
			body: bodyResult.data,
			canPeopleComment: input.canPeopleComment ?? settings.defaultCanPeopleComment,
			canPeopleReact: input.canPeopleReact ?? settings.defaultCanPeopleReact,
			createdAt: now,
			updatedAt: now,
		})
		.returning();

	const attachResult = await replaceAttachments(db, created.id, input.attachments ?? []);
	if (!attachResult.ok) {
		await db.delete(clubPost).where(eq(clubPost.id, created.id));
		return attachResult;
	}

	return getCommunityPost(db, slug, created.slug, viewerUserId);
}

export async function updateCommunityPost(
	db: Database,
	viewerUserId: string,
	slug: string,
	postSlug: string,
	input: {
		title?: string;
		body?: unknown;
		canPeopleComment?: boolean;
		canPeopleReact?: boolean;
		attachments?: AttachmentInput[];
	},
): Promise<ServiceResult<CommunityPostDetailDto>> {
	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	if (!isActiveMember(membership)) {
		return fail("forbidden", "Only members can edit posts");
	}

	const [row] = await db
		.select()
		.from(clubPost)
		.where(and(eq(clubPost.clubId, clubRow.id), eq(clubPost.slug, postSlug)))
		.limit(1);
	if (!row || row.deletedAt) return fail("not_found", "Post not found");
	if (row.authorUserId !== viewerUserId) {
		return fail("forbidden", "Only the author can edit this post");
	}
	if (row.type === "system") {
		return fail("forbidden", "System posts cannot be edited");
	}

	let title = row.title;
	let nextSlug = row.slug;
	if (input.title !== undefined) {
		title = input.title.trim();
		if (!title) return fail("bad_request", "Title is required");
		if (title.length > COMMUNITY_POST_TITLE_MAX) {
			return fail("bad_request", `Title is too long (max ${COMMUNITY_POST_TITLE_MAX})`);
		}
		if (title !== row.title) {
			nextSlug = await uniquePostSlug(db, clubRow.id, title, row.id);
		}
	}

	let body = row.body as RichTextDocument | null;
	if (input.body !== undefined) {
		const bodyResult = sanitizeOptionalBody(input.body, COMMUNITY_POST_BODY_PLAIN_MAX);
		if (!bodyResult.ok) return bodyResult;
		body = bodyResult.data;
	}

	const [updated] = await db
		.update(clubPost)
		.set({
			title,
			slug: nextSlug,
			body,
			canPeopleComment: input.canPeopleComment ?? row.canPeopleComment,
			canPeopleReact: input.canPeopleReact ?? row.canPeopleReact,
			updatedAt: new Date(),
		})
		.where(eq(clubPost.id, row.id))
		.returning();

	if (input.attachments !== undefined) {
		const attachResult = await replaceAttachments(db, updated.id, input.attachments);
		if (!attachResult.ok) return attachResult;
	}

	return getCommunityPost(db, slug, updated.slug, viewerUserId);
}

export async function deleteCommunityPost(
	db: Database,
	viewerUserId: string,
	slug: string,
	postSlug: string,
): Promise<ServiceResult<{ ok: true }>> {
	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	const [row] = await db
		.select()
		.from(clubPost)
		.where(and(eq(clubPost.clubId, clubRow.id), eq(clubPost.slug, postSlug)))
		.limit(1);
	if (!row || row.deletedAt) return fail("not_found", "Post not found");

	const isAuthor = row.authorUserId === viewerUserId;
	if (!isAuthor && !canModerateCommunity(membership)) {
		return fail("forbidden", "You cannot delete this post");
	}

	const [child] = await db
		.select({ id: clubPostComment.id })
		.from(clubPostComment)
		.where(and(eq(clubPostComment.postId, row.id), isNull(clubPostComment.deletedAt)))
		.limit(1);

	if (child) {
		await db
			.update(clubPost)
			.set({
				deletedAt: new Date(),
				title: "[deleted]",
				body: null,
				updatedAt: new Date(),
			})
			.where(eq(clubPost.id, row.id));
	} else {
		await db.delete(clubPost).where(eq(clubPost.id, row.id));
	}

	return ok({ ok: true });
}

export async function pinCommunityPost(
	db: Database,
	viewerUserId: string,
	slug: string,
	postSlug: string,
	pinned: boolean,
): Promise<ServiceResult<CommunityPostDetailDto>> {
	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	if (!canModerateCommunity(membership)) {
		return fail("forbidden", "Only admins and moderators can pin posts");
	}

	const [row] = await db
		.select()
		.from(clubPost)
		.where(and(eq(clubPost.clubId, clubRow.id), eq(clubPost.slug, postSlug)))
		.limit(1);
	if (!row || row.deletedAt) return fail("not_found", "Post not found");

	await db
		.update(clubPost)
		.set({ pinnedAt: pinned ? new Date() : null, updatedAt: new Date() })
		.where(eq(clubPost.id, row.id));

	return getCommunityPost(db, slug, postSlug, viewerUserId);
}

export async function createCommunityComment(
	db: Database,
	viewerUserId: string,
	slug: string,
	postSlug: string,
	input: { body: unknown; parentId?: string | null },
): Promise<ServiceResult<CommunityPostDetailDto>> {
	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	if (!isActiveMember(membership)) {
		return fail("forbidden", "Only active members can comment");
	}

	const [post] = await db
		.select()
		.from(clubPost)
		.where(and(eq(clubPost.clubId, clubRow.id), eq(clubPost.slug, postSlug)))
		.limit(1);
	if (!post || post.deletedAt) return fail("not_found", "Post not found");
	if (!post.canPeopleComment) {
		return fail("forbidden", "Comments are disabled on this post");
	}

	const bodyResult = sanitizeRequiredBody(input.body, COMMUNITY_COMMENT_BODY_PLAIN_MAX);
	if (!bodyResult.ok) return bodyResult;

	let depth = 0;
	let parentId: string | null = null;
	if (input.parentId) {
		const [parent] = await db
			.select()
			.from(clubPostComment)
			.where(and(eq(clubPostComment.id, input.parentId), eq(clubPostComment.postId, post.id)))
			.limit(1);
		if (!parent || parent.deletedAt) return fail("not_found", "Parent comment not found");
		const next = nextCommentDepth(parent.depth);
		if (next == null) {
			return fail("bad_request", `Replies cannot go deeper than ${COMMUNITY_COMMENT_MAX_DEPTH}`);
		}
		depth = next;
		parentId = parent.id;
	}

	const now = new Date();
	await db.insert(clubPostComment).values({
		postId: post.id,
		authorUserId: viewerUserId,
		parentId,
		depth,
		body: bodyResult.data,
		createdAt: now,
		updatedAt: now,
	});

	await db
		.update(clubPost)
		.set({
			commentCount: depth === 0 ? post.commentCount + 1 : post.commentCount,
			replyCount: depth > 0 ? post.replyCount + 1 : post.replyCount,
			updatedAt: now,
		})
		.where(eq(clubPost.id, post.id));

	return getCommunityPost(db, slug, postSlug, viewerUserId);
}

export async function deleteCommunityComment(
	db: Database,
	viewerUserId: string,
	slug: string,
	postSlug: string,
	commentId: string,
): Promise<ServiceResult<CommunityPostDetailDto>> {
	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	const [post] = await db
		.select()
		.from(clubPost)
		.where(and(eq(clubPost.clubId, clubRow.id), eq(clubPost.slug, postSlug)))
		.limit(1);
	if (!post) return fail("not_found", "Post not found");

	const [row] = await db
		.select()
		.from(clubPostComment)
		.where(and(eq(clubPostComment.id, commentId), eq(clubPostComment.postId, post.id)))
		.limit(1);
	if (!row || row.deletedAt) return fail("not_found", "Comment not found");

	const isAuthor = row.authorUserId === viewerUserId;
	if (!isAuthor && !canModerateCommunity(membership)) {
		return fail("forbidden", "You cannot delete this comment");
	}

	const [child] = await db
		.select({ id: clubPostComment.id })
		.from(clubPostComment)
		.where(and(eq(clubPostComment.parentId, row.id), isNull(clubPostComment.deletedAt)))
		.limit(1);

	const wasTop = row.depth === 0;

	if (child) {
		await db
			.update(clubPostComment)
			.set({ deletedAt: new Date(), body: { type: "doc", content: [] }, updatedAt: new Date() })
			.where(eq(clubPostComment.id, row.id));
	} else {
		await db.delete(clubPostComment).where(eq(clubPostComment.id, row.id));
		await db
			.update(clubPost)
			.set({
				commentCount: wasTop ? Math.max(0, post.commentCount - 1) : post.commentCount,
				replyCount: wasTop ? post.replyCount : Math.max(0, post.replyCount - 1),
				updatedAt: new Date(),
			})
			.where(eq(clubPost.id, post.id));
	}

	return getCommunityPost(db, slug, postSlug, viewerUserId);
}

export async function toggleCommunityPostReaction(
	db: Database,
	viewerUserId: string,
	slug: string,
	postSlug: string,
	emoji: string,
): Promise<ServiceResult<CommunityPostDetailDto>> {
	if (!isReactionEmoji(emoji)) return fail("bad_request", "Unsupported reaction");

	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	if (!isActiveMember(membership)) {
		return fail("forbidden", "Only active members can react");
	}

	const [post] = await db
		.select()
		.from(clubPost)
		.where(and(eq(clubPost.clubId, clubRow.id), eq(clubPost.slug, postSlug)))
		.limit(1);
	if (!post || post.deletedAt) return fail("not_found", "Post not found");
	if (!post.canPeopleReact) return fail("forbidden", "Reactions are disabled on this post");

	const [existing] = await db
		.select()
		.from(clubPostReaction)
		.where(and(eq(clubPostReaction.postId, post.id), eq(clubPostReaction.userId, viewerUserId)))
		.limit(1);

	let delta = 0;
	if (existing) {
		if (existing.emoji === emoji) {
			await db.delete(clubPostReaction).where(eq(clubPostReaction.id, existing.id));
			delta = -1;
		} else {
			await db
				.update(clubPostReaction)
				.set({ emoji, updatedAt: new Date() })
				.where(eq(clubPostReaction.id, existing.id));
		}
	} else {
		await db.insert(clubPostReaction).values({
			postId: post.id,
			userId: viewerUserId,
			emoji,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		delta = 1;
	}

	if (delta !== 0) {
		await db
			.update(clubPost)
			.set({
				reactionCount: Math.max(0, post.reactionCount + delta),
				updatedAt: new Date(),
			})
			.where(eq(clubPost.id, post.id));
	}

	return getCommunityPost(db, slug, postSlug, viewerUserId);
}

export async function toggleCommunityCommentReaction(
	db: Database,
	viewerUserId: string,
	slug: string,
	postSlug: string,
	commentId: string,
	emoji: string,
): Promise<ServiceResult<CommunityPostDetailDto>> {
	if (!isReactionEmoji(emoji)) return fail("bad_request", "Unsupported reaction");

	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	if (!isActiveMember(membership)) {
		return fail("forbidden", "Only active members can react");
	}

	const [post] = await db
		.select()
		.from(clubPost)
		.where(and(eq(clubPost.clubId, clubRow.id), eq(clubPost.slug, postSlug)))
		.limit(1);
	if (!post || post.deletedAt) return fail("not_found", "Post not found");
	if (!post.canPeopleReact) return fail("forbidden", "Reactions are disabled on this post");

	const [comment] = await db
		.select()
		.from(clubPostComment)
		.where(and(eq(clubPostComment.id, commentId), eq(clubPostComment.postId, post.id)))
		.limit(1);
	if (!comment || comment.deletedAt) return fail("not_found", "Comment not found");

	const [existing] = await db
		.select()
		.from(clubPostCommentReaction)
		.where(
			and(
				eq(clubPostCommentReaction.commentId, comment.id),
				eq(clubPostCommentReaction.userId, viewerUserId),
			),
		)
		.limit(1);

	if (existing) {
		if (existing.emoji === emoji) {
			await db.delete(clubPostCommentReaction).where(eq(clubPostCommentReaction.id, existing.id));
		} else {
			await db
				.update(clubPostCommentReaction)
				.set({ emoji, updatedAt: new Date() })
				.where(eq(clubPostCommentReaction.id, existing.id));
		}
	} else {
		await db.insert(clubPostCommentReaction).values({
			commentId: comment.id,
			userId: viewerUserId,
			emoji,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}

	return getCommunityPost(db, slug, postSlug, viewerUserId);
}

const SYSTEM_EVENT_TITLES: Record<string, (sessionTitle: string | null) => string> = {
	created: (t) => `New reading session${t ? `: ${t}` : ""}`,
	voting: (t) => `Voting is open${t ? ` for ${t}` : ""}`,
	pending: (t) => `Book selected${t ? ` for ${t}` : ""}`,
	reading: (t) => `Reading has started${t ? `: ${t}` : ""}`,
	reviewing: (t) => `Time to review${t ? `: ${t}` : ""}`,
	completed: (t) => `Session completed${t ? `: ${t}` : ""}`,
	cancelled: (t) => `Session cancelled${t ? `: ${t}` : ""}`,
	abandoned: (t) => `Session abandoned${t ? `: ${t}` : ""}`,
};

/** Create an idempotent system community post for a session lifecycle transition. */
export async function createSessionSystemPost(
	db: Database,
	input: {
		clubId: string;
		clubSlug: string;
		sessionId: string;
		sessionTitle: string | null;
		eventKey: keyof typeof SYSTEM_EVENT_TITLES;
		actorUserId: string | null;
	},
): Promise<void> {
	const titleFn = SYSTEM_EVENT_TITLES[input.eventKey];
	if (!titleFn) return;

	const [existing] = await db
		.select({ id: clubPost.id })
		.from(clubPost)
		.where(
			and(
				eq(clubPost.clubId, input.clubId),
				eq(clubPost.relatedSessionId, input.sessionId),
				eq(clubPost.systemEventKey, input.eventKey),
			),
		)
		.limit(1);
	if (existing) return;

	const title = titleFn(input.sessionTitle).slice(0, COMMUNITY_POST_TITLE_MAX);
	const postSlug = await uniquePostSlug(db, input.clubId, title);
	const body: RichTextDocument = {
		type: "doc",
		content: [
			{
				type: "paragraph",
				content: [
					{
						type: "text",
						text: "Open the session for details.",
						marks: [
							{
								type: "link",
								attrs: {
									href: `/clubs/${input.clubSlug}/sessions/${input.sessionId}`,
									target: "_blank",
									rel: "noopener noreferrer nofollow",
								},
							},
						],
					},
				],
			},
		],
	};

	const now = new Date();
	try {
		await db.insert(clubPost).values({
			clubId: input.clubId,
			authorUserId: input.actorUserId,
			type: "system",
			title,
			slug: postSlug,
			body,
			canPeopleComment: true,
			canPeopleReact: true,
			relatedSessionId: input.sessionId,
			systemEventKey: input.eventKey,
			createdAt: now,
			updatedAt: now,
		});
	} catch {
		// Unique race on system event — ignore.
	}
}

export async function listClubPostsForHomeFeed(
	db: Database,
	viewerId: string,
	limit: number,
): Promise<
	Array<{
		post: PostRow;
		club: { id: string; name: string; slug: string; visibility: ClubRow["visibility"] };
	}>
> {
	const memberships = await db
		.select({
			clubId: clubMembership.clubId,
		})
		.from(clubMembership)
		.where(and(eq(clubMembership.userId, viewerId), eq(clubMembership.status, "active")));

	const memberClubIds = memberships.map((m) => m.clubId);

	const publicClubs = await db
		.select({ id: club.id, name: club.name, slug: club.slug, visibility: club.visibility })
		.from(club)
		.where(eq(club.visibility, "public"));

	const memberClubs =
		memberClubIds.length > 0
			? await db
					.select({ id: club.id, name: club.name, slug: club.slug, visibility: club.visibility })
					.from(club)
					.where(inArray(club.id, memberClubIds))
			: [];

	const clubById = new Map<
		string,
		{ id: string; name: string; slug: string; visibility: ClubRow["visibility"] }
	>();
	for (const c of publicClubs) clubById.set(c.id, c);
	for (const c of memberClubs) clubById.set(c.id, c);

	const clubIds = [...clubById.keys()];
	if (clubIds.length === 0) return [];

	const posts = await db
		.select()
		.from(clubPost)
		.where(and(inArray(clubPost.clubId, clubIds), isNull(clubPost.deletedAt)))
		.orderBy(desc(clubPost.createdAt))
		.limit(limit);

	return posts
		.map((post) => {
			const c = clubById.get(post.clubId);
			if (!c) return null;
			return { post, club: c };
		})
		.filter((row): row is NonNullable<typeof row> => Boolean(row));
}
