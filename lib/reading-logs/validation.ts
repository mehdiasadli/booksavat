import type { ReadingLogStatus } from "@/lib/reading-logs/constants";

export type ReadingLogDateInput = {
	status: ReadingLogStatus;
	startedAt?: Date | null;
	finishedAt?: Date | null;
	/** Reference “today” for tests; defaults to now. */
	now?: Date;
};

export type ReadingLogRereadInput = {
	isReread: boolean;
	/** True when the user already has a finished (completed/dnf) attempt for this work. */
	hasPriorFinished: boolean;
	/** True when at least one finished attempt is a first read (`isReread === false`). */
	hasNonRereadFinished: boolean;
	/**
	 * When updating an existing log that already finished as a first read,
	 * allow keeping `isReread: false` even though “prior finished” exists.
	 */
	isExistingFirstFinished?: boolean;
};

function startOfLocalDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfLocalDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function validateReadingLogDates(input: ReadingLogDateInput): string | null {
	const { status, startedAt, finishedAt } = input;
	const now = input.now ?? new Date();
	const todayEnd = endOfLocalDay(now);

	if (startedAt && startedAt.getTime() > todayEnd.getTime()) {
		return "Started date cannot be in the future.";
	}

	if (finishedAt && finishedAt.getTime() > todayEnd.getTime()) {
		return "Finished date cannot be in the future.";
	}

	if (startedAt && finishedAt && finishedAt.getTime() < startedAt.getTime()) {
		return "Finished date cannot be before started date.";
	}

	if (status === "reading" && finishedAt) {
		return "In-progress logs cannot have a finished date.";
	}

	return null;
}

/**
 * Re-read rules:
 * - A second (or later) attempt after a finished log must be marked re-read.
 * - Re-read requires a prior finished first read (`isReread === false`).
 */
export function validateReadingLogReread(input: ReadingLogRereadInput): string | null {
	const {
		isReread,
		hasPriorFinished,
		hasNonRereadFinished,
		isExistingFirstFinished = false,
	} = input;

	if (isReread && !hasNonRereadFinished) {
		return "Mark a first finished read before starting a re-read.";
	}

	if (!isReread && hasPriorFinished && !isExistingFirstFinished) {
		return "This is another attempt — enable Re-read to continue.";
	}

	return null;
}

export function validateReadingLogInput(
	dates: ReadingLogDateInput,
	reread: ReadingLogRereadInput,
): string | null {
	return validateReadingLogDates(dates) ?? validateReadingLogReread(reread);
}

/** Normalize dates for a status transition (defaults applied by caller). */
export function normalizeDatesForStatus(
	status: ReadingLogStatus,
	startedAt: Date | null | undefined,
	finishedAt: Date | null | undefined,
	now: Date,
): { startedAt: Date | null; finishedAt: Date | null } {
	if (status === "reading") {
		return {
			startedAt: startedAt ?? now,
			finishedAt: null,
		};
	}

	return {
		startedAt: startedAt ?? now,
		finishedAt: finishedAt ?? now,
	};
}

export { endOfLocalDay, startOfLocalDay };
