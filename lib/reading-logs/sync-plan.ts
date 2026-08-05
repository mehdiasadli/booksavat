import type { ReadingLogStatus } from "@/lib/reading-logs/constants";
import { normalizeDatesForStatus } from "@/lib/reading-logs/validation";

export type OpenLogSnapshot = {
	id: string;
	startedAt: Date | null;
};

export type SyncPlan =
	| {
			action: "update";
			logId: string;
			status: ReadingLogStatus;
			startedAt: Date | null;
			finishedAt: Date | null;
	  }
	| {
			action: "insert";
			status: ReadingLogStatus;
			startedAt: Date | null;
			finishedAt: Date | null;
			isReread: boolean;
	  };

/**
 * Pure transition planner for shelf → reading_log sync.
 * Wishlist / clear-status never call this.
 */
export function planReadingLogSync(options: {
	targetStatus: ReadingLogStatus;
	openLog: OpenLogSnapshot | null;
	hasPriorFinished: boolean;
	now: Date;
}): SyncPlan {
	const { targetStatus, openLog, hasPriorFinished, now } = options;

	if (targetStatus === "reading") {
		if (openLog) {
			return {
				action: "update",
				logId: openLog.id,
				status: "reading",
				startedAt: openLog.startedAt ?? now,
				finishedAt: null,
			};
		}

		const dates = normalizeDatesForStatus("reading", now, null, now);
		return {
			action: "insert",
			status: "reading",
			startedAt: dates.startedAt,
			finishedAt: null,
			isReread: hasPriorFinished,
		};
	}

	if (openLog) {
		const dates = normalizeDatesForStatus(targetStatus, openLog.startedAt, now, now);
		return {
			action: "update",
			logId: openLog.id,
			status: targetStatus,
			startedAt: dates.startedAt,
			finishedAt: dates.finishedAt,
		};
	}

	const dates = normalizeDatesForStatus(targetStatus, now, now, now);
	return {
		action: "insert",
		status: targetStatus,
		startedAt: dates.startedAt,
		finishedAt: dates.finishedAt,
		isReread: hasPriorFinished,
	};
}
