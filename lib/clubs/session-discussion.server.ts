import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import type { Database } from "@/db";
import {
	club,
	clubMembership,
	readingSession,
	sessionDiscussionMessage,
	sessionDiscussionReaction,
	user,
} from "@/db/schema";
import {
	buildDiscussionTree,
	canPostSessionDiscussion,
	canViewSessionDiscussion,
	type DiscussionMessageNode,
	isSessionDiscussionReaction,
	nextDiscussionDepth,
	SESSION_DISCUSSION_BODY_PLAIN_MAX,
	SESSION_DISCUSSION_MAX_DEPTH,
	SESSION_DISCUSSION_REACTIONS,
	type SessionDiscussionReactionEmoji,
} from "@/lib/clubs/session-discussion";
import type { ViewerMembership } from "@/lib/clubs/visibility";
import { canViewClubContent } from "@/lib/clubs/visibility";
import {
	isRichTextEmpty,
	type RichTextDocument,
	richTextPlainText,
	sanitizeRichTextDocument,
} from "@/lib/rich-text/document";

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

function isActiveMember(membership: ViewerMembership): boolean {
	return membership?.status === "active";
}

function canModerateDiscussion(membership: ViewerMembership): boolean {
	return Boolean(
		membership &&
			membership.status === "active" &&
			(membership.role === "admin" || membership.role === "moderator"),
	);
}

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

async function requireSession(db: Database, sessionId: string) {
	const [row] = await db
		.select()
		.from(readingSession)
		.where(eq(readingSession.id, sessionId))
		.limit(1);
	return row ?? null;
}

function sanitizeBody(raw: unknown): ServiceResult<RichTextDocument> {
	const sanitized = sanitizeRichTextDocument(raw);
	if (!sanitized.ok) return fail("bad_request", sanitized.error);
	if (isRichTextEmpty(sanitized.document)) {
		return fail("bad_request", "Message cannot be empty");
	}
	const plain = richTextPlainText(sanitized.document);
	if (plain.length > SESSION_DISCUSSION_BODY_PLAIN_MAX) {
		return fail(
			"bad_request",
			`Message is too long (max ${SESSION_DISCUSSION_BODY_PLAIN_MAX} characters)`,
		);
	}
	return ok(sanitized.document);
}

export type SessionDiscussionReactionDto = {
	emoji: SessionDiscussionReactionEmoji;
	count: number;
	reactedByViewer: boolean;
};

export type SessionDiscussionMessageDto = {
	id: string;
	sessionId: string;
	parentId: string | null;
	depth: number;
	body: RichTextDocument;
	createdAt: Date;
	updatedAt: Date;
	author: {
		id: string;
		username: string;
		name: string;
		image: string | null;
	};
	reactions: SessionDiscussionReactionDto[];
	canDelete: boolean;
	canReply: boolean;
};

export type SessionDiscussionState = {
	canPost: boolean;
	canReact: boolean;
	readOnly: boolean;
	maxDepth: number;
	reactionEmojis: string[];
	messages: DiscussionMessageNode<SessionDiscussionMessageDto>[];
	messageCount: number;
};

async function loadDiscussionState(
	db: Database,
	session: typeof readingSession.$inferSelect,
	membership: ViewerMembership,
	viewerUserId: string | null | undefined,
): Promise<SessionDiscussionState> {
	const canPost = canPostSessionDiscussion(session.status) && isActiveMember(membership);
	const canReact = canViewSessionDiscussion(session.status) && isActiveMember(membership);
	const moderate = canModerateDiscussion(membership);

	const messageRows = await db
		.select({
			id: sessionDiscussionMessage.id,
			sessionId: sessionDiscussionMessage.sessionId,
			parentId: sessionDiscussionMessage.parentId,
			depth: sessionDiscussionMessage.depth,
			body: sessionDiscussionMessage.body,
			createdAt: sessionDiscussionMessage.createdAt,
			updatedAt: sessionDiscussionMessage.updatedAt,
			authorId: user.id,
			authorUsername: user.username,
			authorName: user.name,
			authorImage: user.image,
		})
		.from(sessionDiscussionMessage)
		.innerJoin(user, eq(user.id, sessionDiscussionMessage.authorUserId))
		.where(eq(sessionDiscussionMessage.sessionId, session.id))
		.orderBy(asc(sessionDiscussionMessage.createdAt));

	const messageIds = messageRows.map((row) => row.id);
	const reactionRows =
		messageIds.length === 0
			? []
			: await db
					.select({
						messageId: sessionDiscussionReaction.messageId,
						userId: sessionDiscussionReaction.userId,
						emoji: sessionDiscussionReaction.emoji,
					})
					.from(sessionDiscussionReaction)
					.where(inArray(sessionDiscussionReaction.messageId, messageIds));

	const reactionsByMessage = new Map<string, Map<string, Set<string>>>();
	for (const row of reactionRows) {
		if (!isSessionDiscussionReaction(row.emoji)) continue;
		let byEmoji = reactionsByMessage.get(row.messageId);
		if (!byEmoji) {
			byEmoji = new Map();
			reactionsByMessage.set(row.messageId, byEmoji);
		}
		let users = byEmoji.get(row.emoji);
		if (!users) {
			users = new Set();
			byEmoji.set(row.emoji, users);
		}
		users.add(row.userId);
	}

	const flat: SessionDiscussionMessageDto[] = messageRows.map((row) => {
		const emojiMap = reactionsByMessage.get(row.id) ?? new Map();
		const reactions: SessionDiscussionReactionDto[] = SESSION_DISCUSSION_REACTIONS.filter(
			(emoji) => (emojiMap.get(emoji)?.size ?? 0) > 0,
		).map((emoji) => {
			const users = emojiMap.get(emoji) ?? new Set();
			return {
				emoji,
				count: users.size,
				reactedByViewer: Boolean(viewerUserId && users.has(viewerUserId)),
			};
		});

		return {
			id: row.id,
			sessionId: row.sessionId,
			parentId: row.parentId,
			depth: row.depth,
			body: row.body as RichTextDocument,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
			author: {
				id: row.authorId,
				username: row.authorUsername,
				name: row.authorName,
				image: row.authorImage,
			},
			reactions,
			canDelete:
				isActiveMember(membership) &&
				(moderate || (Boolean(viewerUserId) && row.authorId === viewerUserId)),
			canReply: canPost && row.depth < SESSION_DISCUSSION_MAX_DEPTH,
		};
	});

	return {
		canPost,
		canReact,
		readOnly: session.status === "completed",
		maxDepth: SESSION_DISCUSSION_MAX_DEPTH,
		reactionEmojis: [...SESSION_DISCUSSION_REACTIONS],
		messages: buildDiscussionTree(flat),
		messageCount: flat.length,
	};
}

export async function getSessionDiscussion(
	db: Database,
	slug: string,
	sessionId: string,
	viewerUserId: string | null | undefined,
): Promise<ServiceResult<SessionDiscussionState>> {
	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	if (!canViewClubContent({ visibility: clubRow.visibility, membership })) {
		return fail("forbidden", "You cannot view this club’s sessions");
	}

	const session = await requireSession(db, sessionId);
	if (!session || session.clubId !== clubRow.id) return fail("not_found", "Session not found");
	if (!canViewSessionDiscussion(session.status)) {
		return fail("bad_request", "Discussion is only available while reviewing or after completion");
	}

	return ok(await loadDiscussionState(db, session, membership, viewerUserId));
}

export async function createSessionDiscussionMessage(
	db: Database,
	viewerUserId: string,
	slug: string,
	sessionId: string,
	input: { parentId?: string | null; body: unknown },
): Promise<ServiceResult<SessionDiscussionState>> {
	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	if (!isActiveMember(membership)) {
		return fail("forbidden", "Only active members can post in the discussion");
	}

	const session = await requireSession(db, sessionId);
	if (!session || session.clubId !== clubRow.id) return fail("not_found", "Session not found");
	if (!canPostSessionDiscussion(session.status)) {
		return fail("bad_request", "Discussion is closed for new posts");
	}

	const bodyResult = sanitizeBody(input.body);
	if (!bodyResult.ok) return bodyResult;

	let depth = 0;
	let parentId: string | null = null;
	if (input.parentId) {
		const [parent] = await db
			.select({
				id: sessionDiscussionMessage.id,
				sessionId: sessionDiscussionMessage.sessionId,
				depth: sessionDiscussionMessage.depth,
			})
			.from(sessionDiscussionMessage)
			.where(eq(sessionDiscussionMessage.id, input.parentId))
			.limit(1);
		if (!parent || parent.sessionId !== session.id) {
			return fail("not_found", "Parent message not found");
		}
		const next = nextDiscussionDepth(parent.depth);
		if (next == null) {
			return fail(
				"bad_request",
				`Replies cannot go deeper than depth ${SESSION_DISCUSSION_MAX_DEPTH}`,
			);
		}
		depth = next;
		parentId = parent.id;
	}

	const now = new Date();
	await db.insert(sessionDiscussionMessage).values({
		sessionId: session.id,
		authorUserId: viewerUserId,
		parentId,
		depth,
		body: bodyResult.data,
		createdAt: now,
		updatedAt: now,
	});

	return ok(await loadDiscussionState(db, session, membership, viewerUserId));
}

export async function deleteSessionDiscussionMessage(
	db: Database,
	viewerUserId: string,
	slug: string,
	sessionId: string,
	messageId: string,
): Promise<ServiceResult<SessionDiscussionState>> {
	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	if (!isActiveMember(membership)) {
		return fail("forbidden", "Only active members can delete discussion messages");
	}

	const session = await requireSession(db, sessionId);
	if (!session || session.clubId !== clubRow.id) return fail("not_found", "Session not found");
	if (!canViewSessionDiscussion(session.status)) {
		return fail("bad_request", "Discussion is not available for this session");
	}

	const [message] = await db
		.select({
			id: sessionDiscussionMessage.id,
			authorUserId: sessionDiscussionMessage.authorUserId,
			sessionId: sessionDiscussionMessage.sessionId,
		})
		.from(sessionDiscussionMessage)
		.where(eq(sessionDiscussionMessage.id, messageId))
		.limit(1);

	if (!message || message.sessionId !== session.id) {
		return fail("not_found", "Message not found");
	}

	const moderate = canModerateDiscussion(membership);
	if (message.authorUserId !== viewerUserId && !moderate) {
		return fail("forbidden", "You can only delete your own messages");
	}

	await db.delete(sessionDiscussionMessage).where(eq(sessionDiscussionMessage.id, message.id));

	return ok(await loadDiscussionState(db, session, membership, viewerUserId));
}

export async function toggleSessionDiscussionReaction(
	db: Database,
	viewerUserId: string,
	slug: string,
	sessionId: string,
	messageId: string,
	emoji: string,
): Promise<ServiceResult<SessionDiscussionState>> {
	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	if (!isActiveMember(membership)) {
		return fail("forbidden", "Only active members can react");
	}

	const session = await requireSession(db, sessionId);
	if (!session || session.clubId !== clubRow.id) return fail("not_found", "Session not found");
	if (!canViewSessionDiscussion(session.status) || session.status === "completed") {
		return fail("bad_request", "Reactions are only open while the session is reviewing");
	}

	if (!isSessionDiscussionReaction(emoji)) {
		return fail("bad_request", "Unsupported reaction");
	}

	const [message] = await db
		.select({ id: sessionDiscussionMessage.id, sessionId: sessionDiscussionMessage.sessionId })
		.from(sessionDiscussionMessage)
		.where(eq(sessionDiscussionMessage.id, messageId))
		.limit(1);
	if (!message || message.sessionId !== session.id) {
		return fail("not_found", "Message not found");
	}

	const [existing] = await db
		.select({
			id: sessionDiscussionReaction.id,
			emoji: sessionDiscussionReaction.emoji,
		})
		.from(sessionDiscussionReaction)
		.where(
			and(
				eq(sessionDiscussionReaction.messageId, message.id),
				eq(sessionDiscussionReaction.userId, viewerUserId),
			),
		)
		.limit(1);

	const now = new Date();
	if (existing?.emoji === emoji) {
		await db.delete(sessionDiscussionReaction).where(eq(sessionDiscussionReaction.id, existing.id));
	} else if (existing) {
		await db
			.update(sessionDiscussionReaction)
			.set({ emoji, updatedAt: now })
			.where(eq(sessionDiscussionReaction.id, existing.id));
	} else {
		await db.insert(sessionDiscussionReaction).values({
			messageId: message.id,
			userId: viewerUserId,
			emoji,
			createdAt: now,
			updatedAt: now,
		});
	}

	return ok(await loadDiscussionState(db, session, membership, viewerUserId));
}
