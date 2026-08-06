export type VoteChipsByRole = {
	admin: number[];
	moderator: number[];
	member: number[];
};

type ChipRole = keyof VoteChipsByRole;

export const DEFAULT_VOTE_CHIPS_BY_ROLE: VoteChipsByRole = {
	admin: [1, 2, 3],
	moderator: [1, 2, 3],
	member: [1, 2, 3],
};

export const VOTE_CHIP_MIN = 1;
export const VOTE_CHIP_MAX = 99;
export const VOTE_CHIPS_PER_ROLE_MAX = 8;

export type VoteAssignmentInput = {
	points: number;
	workId: string;
};

/** Normalize + validate chip sets. Returns null if invalid. */
export function normalizeVoteChips(input: unknown): VoteChipsByRole | null {
	if (!input || typeof input !== "object") return null;
	const record = input as Record<string, unknown>;
	const roles = ["admin", "moderator", "member"] as const;
	const out: VoteChipsByRole = {
		admin: [],
		moderator: [],
		member: [],
	};

	for (const role of roles) {
		const raw = record[role];
		if (!Array.isArray(raw) || raw.length === 0 || raw.length > VOTE_CHIPS_PER_ROLE_MAX) {
			return null;
		}
		const chips: number[] = [];
		const seen = new Set<number>();
		for (const value of raw) {
			if (typeof value !== "number" || !Number.isInteger(value)) return null;
			if (value < VOTE_CHIP_MIN || value > VOTE_CHIP_MAX) return null;
			if (seen.has(value)) return null;
			seen.add(value);
			chips.push(value);
		}
		chips.sort((a, b) => a - b);
		out[role] = chips;
	}

	return out;
}

export function chipsForRole(chips: VoteChipsByRole, role: ChipRole): number[] {
	return chips[role] ?? chips.member;
}

/**
 * Each chip used once, each on a different shortlisted book.
 * Returns an error message or null when valid.
 */
export function validateVoteAssignments(
	assignments: VoteAssignmentInput[],
	chips: number[],
	shortlistWorkIds: ReadonlySet<string>,
): string | null {
	if (assignments.length !== chips.length) {
		return `Assign each of your ${chips.length} point chips to a different book`;
	}

	const chipSet = new Set(chips);
	const usedPoints = new Set<number>();
	const usedWorks = new Set<string>();

	for (const assignment of assignments) {
		if (!chipSet.has(assignment.points)) {
			return "Invalid point chip";
		}
		if (usedPoints.has(assignment.points)) {
			return "Each point chip can only be used once";
		}
		if (!shortlistWorkIds.has(assignment.workId)) {
			return "Votes must be on shortlisted books";
		}
		if (usedWorks.has(assignment.workId)) {
			return "Each book can only receive one of your chips";
		}
		usedPoints.add(assignment.points);
		usedWorks.add(assignment.workId);
	}

	return null;
}

export function tallyScores(
	assignments: ReadonlyArray<{ workId: string; points: number }>,
): Map<string, number> {
	const scores = new Map<string, number>();
	for (const row of assignments) {
		scores.set(row.workId, (scores.get(row.workId) ?? 0) + row.points);
	}
	return scores;
}

/** Work ids tied for the highest score. Empty shortlist → []. No votes → all shortlisted. */
export function leadingWorkIds(
	shortlistWorkIds: readonly string[],
	scores: ReadonlyMap<string, number>,
): string[] {
	if (shortlistWorkIds.length === 0) return [];

	let max = Number.NEGATIVE_INFINITY;
	let anyVotes = false;
	for (const workId of shortlistWorkIds) {
		const score = scores.get(workId) ?? 0;
		if (score > 0) anyVotes = true;
		if (score > max) max = score;
	}

	if (!anyVotes) return [...shortlistWorkIds];

	return shortlistWorkIds.filter((workId) => (scores.get(workId) ?? 0) === max);
}

export function parseChipListInput(raw: string): number[] | null {
	const parts = raw
		.split(/[,\s]+/)
		.map((part) => part.trim())
		.filter(Boolean);
	if (parts.length === 0) return null;
	const chips: number[] = [];
	for (const part of parts) {
		const value = Number(part);
		if (!Number.isInteger(value)) return null;
		chips.push(value);
	}
	return chips;
}
