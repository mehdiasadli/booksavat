import "server-only";

import { desc, inArray } from "drizzle-orm";

import type { Database } from "@/db";
import { feedback, readingLog } from "@/db/schema";
import { coverUrlFromCoverId } from "@/lib/books/covers";
import { listClubPostsForHomeFeed } from "@/lib/clubs/community.server";
import { parseFeedbackRating } from "@/lib/feedback/rating";
import { listAcceptedFollowingIds, loadUsersByIds } from "@/lib/follows/service.server";
import { isRichTextEmpty, type RichTextDocument } from "@/lib/rich-text/document";
import { olib } from "@/olib";

export type FeedItem =
	| {
			type: "reading_log";
			id: string;
			occurredAt: Date;
			user: {
				id: string;
				username: string;
				name: string;
				image: string | null;
			};
			workId: string;
			title: string;
			coverUrl: string | null;
			status: "reading" | "completed" | "dnf";
			startedAt: Date | null;
			finishedAt: Date | null;
			isReread: boolean;
	  }
	| {
			type: "feedback";
			id: string;
			occurredAt: Date;
			user: {
				id: string;
				username: string;
				name: string;
				image: string | null;
			};
			workId: string;
			title: string;
			coverUrl: string | null;
			rating: number;
			hasReview: boolean;
	  }
	| {
			type: "club_post";
			id: string;
			occurredAt: Date;
			user: {
				id: string;
				username: string;
				name: string;
				image: string | null;
			} | null;
			club: { id: string; name: string; slug: string };
			postSlug: string;
			title: string;
			postType: "discussion" | "announcement" | "system";
	  };

type HomeFeedCursor = { occurredAt: string; id: string };

function encodeHomeCursor(payload: HomeFeedCursor): string {
	return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeHomeCursor(cursor: string): HomeFeedCursor | null {
	try {
		const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as HomeFeedCursor;
		if (!parsed?.occurredAt || !parsed?.id) return null;
		return parsed;
	} catch {
		return null;
	}
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

/**
 * Reverse-chron activity for the viewer: follows + club posts they can see.
 * Cursor-based pages for infinite scroll.
 */
export async function listHomeFeed(
	db: Database,
	viewerId: string,
	pagination: { limit: number; cursor?: string | null },
): Promise<{ items: FeedItem[]; nextCursor: string | null }> {
	const followingIds = await listAcceptedFollowingIds(db, viewerId);
	const userIds = [viewerId, ...followingIds];
	const fetchLimit = Math.min(200, pagination.limit + 80);

	const [logRows, feedbackRows, clubPostRows] = await Promise.all([
		db
			.select()
			.from(readingLog)
			.where(inArray(readingLog.userId, userIds))
			.orderBy(desc(readingLog.updatedAt))
			.limit(fetchLimit),
		db
			.select()
			.from(feedback)
			.where(inArray(feedback.userId, userIds))
			.orderBy(desc(feedback.updatedAt))
			.limit(fetchLimit),
		listClubPostsForHomeFeed(db, viewerId, fetchLimit),
	]);

	const authorIds = [
		...userIds,
		...clubPostRows.map((r) => r.post.authorUserId).filter((id): id is string => Boolean(id)),
	];
	const users = await loadUsersByIds(db, authorIds);
	const workIds = [
		...new Set([...logRows.map((r) => r.workId), ...feedbackRows.map((r) => r.workId)]),
	];
	const workPreviews = new Map(
		await Promise.all(workIds.map(async (workId) => [workId, await hydrateWork(workId)] as const)),
	);

	const merged: FeedItem[] = [];

	for (const row of logRows) {
		const actor = users.get(row.userId);
		const preview = workPreviews.get(row.workId) ?? { title: "Unknown work", coverUrl: null };
		if (!actor) continue;

		merged.push({
			type: "reading_log",
			id: `reading_log:${row.id}`,
			occurredAt: row.updatedAt,
			user: {
				id: actor.id,
				username: actor.username,
				name: actor.name,
				image: actor.image,
			},
			workId: row.workId,
			title: preview.title,
			coverUrl: preview.coverUrl,
			status: row.status,
			startedAt: row.startedAt,
			finishedAt: row.finishedAt,
			isReread: row.isReread,
		});
	}

	for (const row of feedbackRows) {
		const actor = users.get(row.userId);
		const preview = workPreviews.get(row.workId) ?? { title: "Unknown work", coverUrl: null };
		if (!actor) continue;

		const review = (row.review as RichTextDocument | null) ?? null;
		merged.push({
			type: "feedback",
			id: `feedback:${row.id}`,
			occurredAt: row.updatedAt,
			user: {
				id: actor.id,
				username: actor.username,
				name: actor.name,
				image: actor.image,
			},
			workId: row.workId,
			title: preview.title,
			coverUrl: preview.coverUrl,
			rating: parseFeedbackRating(row.rating) ?? 0,
			hasReview: Boolean(review && !isRichTextEmpty(review)),
		});
	}

	for (const { post, club } of clubPostRows) {
		const actor = post.authorUserId ? (users.get(post.authorUserId) ?? null) : null;
		merged.push({
			type: "club_post",
			id: `club_post:${post.id}`,
			occurredAt: post.createdAt,
			user: actor
				? {
						id: actor.id,
						username: actor.username,
						name: actor.name,
						image: actor.image,
					}
				: null,
			club: { id: club.id, name: club.name, slug: club.slug },
			postSlug: post.slug,
			title: post.title,
			postType: post.type,
		});
	}

	merged.sort((a, b) => {
		const diff = b.occurredAt.getTime() - a.occurredAt.getTime();
		if (diff !== 0) return diff;
		return a.id < b.id ? 1 : -1;
	});

	const cursor = pagination.cursor ? decodeHomeCursor(pagination.cursor) : null;
	let start = 0;
	if (cursor) {
		const exact = merged.findIndex((item) => item.id === cursor.id);
		if (exact >= 0) {
			start = exact + 1;
		} else {
			start = merged.findIndex((item) => {
				const iso = item.occurredAt.toISOString();
				return iso < cursor.occurredAt || (iso === cursor.occurredAt && item.id < cursor.id);
			});
			if (start < 0) start = merged.length;
		}
	}

	const page = merged.slice(start, start + pagination.limit);
	const last = page[page.length - 1];
	const nextCursor =
		last && start + pagination.limit < merged.length
			? encodeHomeCursor({ occurredAt: last.occurredAt.toISOString(), id: last.id })
			: null;

	return { items: page, nextCursor };
}
