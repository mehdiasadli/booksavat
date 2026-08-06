import type { ReadingLogStatus } from "@/lib/reading-logs/constants";

export const SESSION_PARTICIPANT_READING_STATUSES = [
	"not_started",
	"reading",
	"completed",
	"dnf",
] as const;

export type SessionParticipantReadingStatus = (typeof SESSION_PARTICIPANT_READING_STATUSES)[number];

export function effectiveParticipantReadingStatus(options: {
	overrideStatus: ReadingLogStatus | null;
	derivedStatus: ReadingLogStatus | null;
}): SessionParticipantReadingStatus {
	return options.overrideStatus ?? options.derivedStatus ?? "not_started";
}

export function canShowSessionReadingProgress(status: string): boolean {
	return status === "pending" || status === "reading" || status === "reviewing";
}

export function summarizeParticipantReading(
	statuses: readonly SessionParticipantReadingStatus[],
): Record<SessionParticipantReadingStatus, number> {
	const summary: Record<SessionParticipantReadingStatus, number> = {
		not_started: 0,
		reading: 0,
		completed: 0,
		dnf: 0,
	};
	for (const status of statuses) {
		summary[status] += 1;
	}
	return summary;
}
