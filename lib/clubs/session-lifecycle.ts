export const READING_SESSION_STATUSES = [
	"proposed",
	"voting",
	"pending",
	"reading",
	"reviewing",
	"completed",
	"cancelled",
	"abandoned",
] as const;

export type ReadingSessionStatus = (typeof READING_SESSION_STATUSES)[number];

export const LIVE_SESSION_STATUSES = [
	"proposed",
	"voting",
	"pending",
	"reading",
	"reviewing",
] as const satisfies readonly ReadingSessionStatus[];

export type LiveSessionStatus = (typeof LIVE_SESSION_STATUSES)[number];

const ADVANCE: Partial<Record<ReadingSessionStatus, ReadingSessionStatus>> = {
	proposed: "voting",
	voting: "pending",
	pending: "reading",
	reading: "reviewing",
	reviewing: "completed",
};

export function isLiveSessionStatus(status: ReadingSessionStatus): status is LiveSessionStatus {
	return (LIVE_SESSION_STATUSES as readonly string[]).includes(status);
}

export function isTerminalSessionStatus(status: ReadingSessionStatus): boolean {
	return status === "completed" || status === "cancelled" || status === "abandoned";
}

/** Join/leave window: live stages before reading, while before join deadline. */
export function canJoinOrLeaveSession(options: {
	status: ReadingSessionStatus;
	joinDeadline: Date;
	now?: Date;
}): boolean {
	const now = options.now ?? new Date();
	if (now.getTime() > options.joinDeadline.getTime()) return false;
	return (
		options.status === "proposed" || options.status === "voting" || options.status === "pending"
	);
}

export function nextAdvanceStatus(status: ReadingSessionStatus): ReadingSessionStatus | null {
	return ADVANCE[status] ?? null;
}

export function canCancelSession(status: ReadingSessionStatus): boolean {
	return status === "proposed" || status === "voting" || status === "pending";
}

export function canAbandonSession(status: ReadingSessionStatus): boolean {
	return status === "reading";
}

/**
 * Advancing voting → pending requires a resolved selected work (plurality winner
 * or admin/mod tie-break pick among leaders).
 */
export function advanceRequiresSelectedWork(from: ReadingSessionStatus): boolean {
	return from === "voting";
}

/** Minimum shortlist size before opening voting. */
export const SESSION_SHORTLIST_MIN = 2;

export function selectedWorkRequiredForStatus(status: ReadingSessionStatus): boolean {
	return status === "pending" || status === "reading" || status === "reviewing";
}
