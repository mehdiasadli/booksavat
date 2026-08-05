import "server-only";

import { and, eq } from "drizzle-orm";

import type { Database } from "@/db";
import { feedback, readingLog } from "@/db/schema";
import { toWorkId } from "@/lib/books/ids";
import { parseFeedbackRating } from "@/lib/feedback/rating";
import {
	isRichTextEmpty,
	type RichTextDocument,
	sanitizeRichTextDocument,
} from "@/lib/rich-text/document";

export type FeedbackDto = {
	id: string;
	workId: string;
	rating: number;
	review: RichTextDocument | null;
	createdAt: Date;
	updatedAt: Date;
};

function toDto(row: typeof feedback.$inferSelect): FeedbackDto {
	const rating = parseFeedbackRating(row.rating);
	return {
		id: row.id,
		workId: row.workId,
		rating: rating ?? 0,
		review: (row.review as RichTextDocument | null) ?? null,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

async function hasCompletedLog(db: Database, userId: string, workId: string): Promise<boolean> {
	const [row] = await db
		.select({ id: readingLog.id })
		.from(readingLog)
		.where(
			and(
				eq(readingLog.userId, userId),
				eq(readingLog.workId, workId),
				eq(readingLog.status, "completed"),
			),
		)
		.limit(1);

	return Boolean(row);
}

export async function getFeedbackForWork(
	db: Database,
	userId: string,
	rawWorkId: string,
): Promise<FeedbackDto | null> {
	const workId = toWorkId(rawWorkId);
	const [row] = await db
		.select()
		.from(feedback)
		.where(and(eq(feedback.userId, userId), eq(feedback.workId, workId)))
		.limit(1);

	return row ? toDto(row) : null;
}

export async function upsertFeedback(
	db: Database,
	userId: string,
	input: {
		workId: string;
		rating: number;
		review?: unknown;
	},
): Promise<
	| { ok: true; feedback: FeedbackDto }
	| { ok: false; error: "forbidden" | "invalid"; message: string }
> {
	const workId = toWorkId(input.workId);
	const rating = parseFeedbackRating(input.rating);
	if (rating == null) {
		return {
			ok: false,
			error: "invalid",
			message: "Rating must be between 0 and 5 in 0.5 steps.",
		};
	}

	const completed = await hasCompletedLog(db, userId, workId);
	if (!completed) {
		return {
			ok: false,
			error: "forbidden",
			message: "Finish the book before leaving feedback.",
		};
	}

	let review: RichTextDocument | null = null;
	if (input.review != null) {
		const sanitized = sanitizeRichTextDocument(input.review);
		if (!sanitized.ok) {
			return { ok: false, error: "invalid", message: sanitized.error };
		}
		review = isRichTextEmpty(sanitized.document) ? null : sanitized.document;
	}

	const now = new Date();
	const [existing] = await db
		.select()
		.from(feedback)
		.where(and(eq(feedback.userId, userId), eq(feedback.workId, workId)))
		.limit(1);

	if (existing) {
		const [updated] = await db
			.update(feedback)
			.set({
				rating: rating.toFixed(1),
				review,
				updatedAt: now,
			})
			.where(eq(feedback.id, existing.id))
			.returning();

		return { ok: true, feedback: toDto(updated) };
	}

	const [created] = await db
		.insert(feedback)
		.values({
			userId,
			workId,
			rating: rating.toFixed(1),
			review,
			createdAt: now,
			updatedAt: now,
		})
		.returning();

	return { ok: true, feedback: toDto(created) };
}

export async function deleteFeedback(
	db: Database,
	userId: string,
	rawWorkId: string,
): Promise<boolean> {
	const workId = toWorkId(rawWorkId);
	const deleted = await db
		.delete(feedback)
		.where(and(eq(feedback.userId, userId), eq(feedback.workId, workId)))
		.returning({ id: feedback.id });

	return deleted.length > 0;
}
