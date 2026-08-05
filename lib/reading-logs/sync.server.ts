import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import type { Database } from "@/db";
import { readingLog } from "@/db/schema";
import {
	isLoggableSystemKey,
	type LoggableSystemKey,
	systemKeyToLogStatus,
} from "@/lib/reading-logs/constants";
import { planReadingLogSync } from "@/lib/reading-logs/sync-plan";

type DbLike = Pick<Database, "select" | "insert" | "update">;

async function findOpenReadingLog(db: DbLike, userId: string, workId: string) {
	const [row] = await db
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

	return row ?? null;
}

async function hasPriorFinishedLog(db: DbLike, userId: string, workId: string): Promise<boolean> {
	const [row] = await db
		.select({ id: readingLog.id })
		.from(readingLog)
		.where(
			and(
				eq(readingLog.userId, userId),
				eq(readingLog.workId, workId),
				inArray(readingLog.status, ["completed", "dnf"]),
			),
		)
		.limit(1);

	return Boolean(row);
}

/**
 * Sync reading logs when a work moves onto a loggable system shelf.
 * Wishlist and custom shelves do not call this.
 */
export async function syncReadingLogForSystemShelfChange(
	db: DbLike,
	options: {
		userId: string;
		workId: string;
		systemKey: LoggableSystemKey;
		now?: Date;
	},
): Promise<typeof readingLog.$inferSelect> {
	const now = options.now ?? new Date();
	const status = systemKeyToLogStatus(options.systemKey);
	const open = await findOpenReadingLog(db, options.userId, options.workId);
	const hasPriorFinished = await hasPriorFinishedLog(db, options.userId, options.workId);

	const plan = planReadingLogSync({
		targetStatus: status,
		openLog: open ? { id: open.id, startedAt: open.startedAt } : null,
		hasPriorFinished,
		now,
	});

	if (plan.action === "update") {
		const [updated] = await db
			.update(readingLog)
			.set({
				status: plan.status,
				startedAt: plan.startedAt,
				finishedAt: plan.finishedAt,
				updatedAt: now,
			})
			.where(eq(readingLog.id, plan.logId))
			.returning();

		return updated;
	}

	const [created] = await db
		.insert(readingLog)
		.values({
			userId: options.userId,
			workId: options.workId,
			status: plan.status,
			startedAt: plan.startedAt,
			finishedAt: plan.finishedAt,
			isReread: plan.isReread,
			createdAt: now,
			updatedAt: now,
		})
		.returning();

	return created;
}

export { isLoggableSystemKey };
