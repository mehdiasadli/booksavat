import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";

import type { Database } from "@/db";
import { readingLog, shelf, user } from "@/db/schema";
import { coverUrlFromCoverId } from "@/lib/books/covers";
import { toWorkId } from "@/lib/books/ids";
import type { ReadingLogStatus } from "@/lib/reading-logs/constants";
import { summarizeReadingHistory } from "@/lib/reading-logs/history";
import { validateReadingLogInput } from "@/lib/reading-logs/validation";
import { addWorkToShelf } from "@/lib/shelves/service.server";
import { olib } from "@/olib";

export type ReadingLogRow = typeof readingLog.$inferSelect;

export type ReadingLogDto = {
	id: string;
	workId: string;
	status: ReadingLogStatus;
	startedAt: Date | null;
	finishedAt: Date | null;
	isReread: boolean;
	createdAt: Date;
	updatedAt: Date;
	title: string;
	coverUrl: string | null;
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

function toDto(
	row: ReadingLogRow,
	preview: { title: string; coverUrl: string | null },
): ReadingLogDto {
	return {
		id: row.id,
		workId: row.workId,
		status: row.status,
		startedAt: row.startedAt,
		finishedAt: row.finishedAt,
		isReread: row.isReread,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		title: preview.title,
		coverUrl: preview.coverUrl,
	};
}

async function requireUserByUsername(db: Database, username: string) {
	const [row] = await db
		.select({ id: user.id, username: user.username })
		.from(user)
		.where(eq(user.username, username))
		.limit(1);

	return row ?? null;
}

export async function listReadingLogsByUsername(
	db: Database,
	username: string,
	viewerUserId: string | null | undefined,
	pagination: { limit: number; offset: number },
): Promise<{
	ownerUsername: string;
	items: ReadingLogDto[];
	total: number;
	nextOffset: number | null;
} | null> {
	const owner = await requireUserByUsername(db, username);
	if (!owner) {
		return null;
	}

	// Owner-only diary for now.
	if (!viewerUserId || viewerUserId !== owner.id) {
		return null;
	}

	const rows = await db
		.select()
		.from(readingLog)
		.where(eq(readingLog.userId, owner.id))
		.orderBy(desc(readingLog.createdAt), desc(readingLog.startedAt));

	const total = rows.length;
	const page = rows.slice(pagination.offset, pagination.offset + pagination.limit);

	const items = await Promise.all(
		page.map(async (row) => toDto(row, await hydrateWork(row.workId))),
	);

	const consumed = pagination.offset + items.length;

	return {
		ownerUsername: owner.username,
		items,
		total,
		nextOffset: consumed < total ? consumed : null,
	};
}

export async function getActiveReadingLogForWork(
	db: Database,
	userId: string,
	rawWorkId: string,
): Promise<ReadingLogDto | null> {
	const workId = toWorkId(rawWorkId);

	const [open] = await db
		.select()
		.from(readingLog)
		.where(
			and(
				eq(readingLog.userId, userId),
				eq(readingLog.workId, workId),
				eq(readingLog.status, "reading"),
			),
		)
		.orderBy(desc(readingLog.createdAt))
		.limit(1);

	if (open) {
		return toDto(open, await hydrateWork(workId));
	}

	const [latest] = await db
		.select()
		.from(readingLog)
		.where(and(eq(readingLog.userId, userId), eq(readingLog.workId, workId)))
		.orderBy(desc(readingLog.updatedAt))
		.limit(1);

	if (!latest) {
		return null;
	}

	return toDto(latest, await hydrateWork(workId));
}

export async function listReadingLogsForWork(
	db: Database,
	userId: string,
	rawWorkId: string,
): Promise<ReadingLogDto[]> {
	const workId = toWorkId(rawWorkId);

	const rows = await db
		.select()
		.from(readingLog)
		.where(and(eq(readingLog.userId, userId), eq(readingLog.workId, workId)))
		.orderBy(desc(readingLog.createdAt), asc(readingLog.startedAt));

	const preview = await hydrateWork(workId);
	return rows.map((row) => toDto(row, preview));
}

export async function updateReadingLog(
	db: Database,
	userId: string,
	logId: string,
	input: {
		status?: ReadingLogStatus;
		startedAt?: Date | null;
		finishedAt?: Date | null;
		isReread?: boolean;
	},
): Promise<
	{ ok: true; log: ReadingLogDto } | { ok: false; error: "not_found" | "invalid"; message?: string }
> {
	const [existing] = await db
		.select()
		.from(readingLog)
		.where(and(eq(readingLog.id, logId), eq(readingLog.userId, userId)))
		.limit(1);

	if (!existing) {
		return { ok: false, error: "not_found" };
	}

	const status = input.status ?? existing.status;
	const startedAt = input.startedAt !== undefined ? input.startedAt : existing.startedAt;
	let finishedAt = input.finishedAt !== undefined ? input.finishedAt : existing.finishedAt;

	if (status === "reading") {
		finishedAt = null;
	}

	const isReread = input.isReread ?? existing.isReread;
	const siblings = await db
		.select({
			id: readingLog.id,
			status: readingLog.status,
			isReread: readingLog.isReread,
		})
		.from(readingLog)
		.where(and(eq(readingLog.userId, userId), eq(readingLog.workId, existing.workId)));

	const history = summarizeReadingHistory(siblings, { excludeLogId: existing.id });
	const isExistingFirstFinished =
		(existing.status === "completed" || existing.status === "dnf") && !existing.isReread;

	const validationError = validateReadingLogInput(
		{ status, startedAt, finishedAt },
		{
			isReread,
			hasPriorFinished: history.hasPriorFinished,
			hasNonRereadFinished: history.hasNonRereadFinished,
			isExistingFirstFinished,
		},
	);
	if (validationError) {
		return { ok: false, error: "invalid", message: validationError };
	}

	const now = new Date();
	const [updated] = await db
		.update(readingLog)
		.set({
			status,
			startedAt,
			finishedAt,
			isReread,
			updatedAt: now,
		})
		.where(eq(readingLog.id, logId))
		.returning();

	// Keep system shelf in sync when status changes via the log editor.
	// Skip reading-log sync — this row was already updated above.
	if (input.status && input.status !== existing.status) {
		const [targetShelf] = await db
			.select()
			.from(shelf)
			.where(
				and(eq(shelf.userId, userId), eq(shelf.isSystem, true), eq(shelf.systemKey, input.status)),
			)
			.limit(1);

		if (targetShelf) {
			await addWorkToShelf(db, userId, targetShelf.id, existing.workId, {
				syncReadingLog: false,
			});
		}
	}

	return {
		ok: true,
		log: toDto(updated, await hydrateWork(updated.workId)),
	};
}

export async function startReread(
	db: Database,
	userId: string,
	rawWorkId: string,
): Promise<ReadingLogDto | null> {
	const workId = toWorkId(rawWorkId);

	const [readingShelf] = await db
		.select()
		.from(shelf)
		.where(and(eq(shelf.userId, userId), eq(shelf.isSystem, true), eq(shelf.systemKey, "reading")))
		.limit(1);

	if (!readingShelf) {
		return null;
	}

	// addWorkToShelf triggers sync → new reading log with isReread when prior finished exists
	await addWorkToShelf(db, userId, readingShelf.id, workId);

	return getActiveReadingLogForWork(db, userId, workId);
}
