import type { ReadingLogStatus } from "@/lib/reading-logs/constants";

export type ReadingLogHistoryItem = {
	id: string;
	status: ReadingLogStatus;
	isReread: boolean;
};

export function summarizeReadingHistory(
	items: ReadingLogHistoryItem[],
	options: { excludeLogId?: string } = {},
): {
	hasPriorFinished: boolean;
	hasNonRereadFinished: boolean;
} {
	const relevant = options.excludeLogId
		? items.filter((item) => item.id !== options.excludeLogId)
		: items;

	const finished = relevant.filter((item) => item.status === "completed" || item.status === "dnf");

	return {
		hasPriorFinished: finished.length > 0,
		hasNonRereadFinished: finished.some((item) => !item.isReread),
	};
}
