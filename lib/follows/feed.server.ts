import "server-only";

import { desc, inArray } from "drizzle-orm";

import type { Database } from "@/db";
import { feedback, readingLog } from "@/db/schema";
import { coverUrlFromCoverId } from "@/lib/books/covers";
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
	  };

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
 * Reverse-chron activity for the viewer and everyone they follow (accepted).
 * Merges reading-log updates and feedback in memory for v1.
 */
export async function listHomeFeed(
	db: Database,
	viewerId: string,
	pagination: { limit: number; offset: number },
): Promise<{ items: FeedItem[]; total: number; nextOffset: number | null }> {
	const followingIds = await listAcceptedFollowingIds(db, viewerId);
	const userIds = [viewerId, ...followingIds];

	// Fetch a window large enough to merge/sort, then page in memory.
	const fetchLimit = Math.min(200, pagination.offset + pagination.limit + 50);

	const [logRows, feedbackRows] = await Promise.all([
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
	]);

	const users = await loadUsersByIds(db, userIds);
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

	merged.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

	const total = merged.length;
	const page = merged.slice(pagination.offset, pagination.offset + pagination.limit);
	const consumed = pagination.offset + page.length;

	return {
		items: page,
		total,
		nextOffset: consumed < total ? consumed : null,
	};
}
