import { formatShortDate } from "@/lib/dates";
import type { ReadingLogStatus } from "@/lib/reading-logs/constants";

export const READING_LOG_STATUS_LABEL: Record<ReadingLogStatus, string> = {
	reading: "Reading",
	completed: "Completed",
	dnf: "DNF",
};

export function formatReadingLogDates(input: {
	status: ReadingLogStatus;
	startedAt: Date | null;
	finishedAt: Date | null;
}): string {
	const started = input.startedAt ? formatShortDate(input.startedAt) : null;
	const finished = input.finishedAt ? formatShortDate(input.finishedAt) : null;

	if (input.status === "reading") {
		return started ? `Started ${started}` : "In progress";
	}

	if (started && finished) {
		return `${started} → ${finished}`;
	}

	if (finished) {
		return `Finished ${finished}`;
	}

	if (started) {
		return `Started ${started}`;
	}

	return "No dates set";
}
