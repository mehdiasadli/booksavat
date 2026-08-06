import { describe, expect, it } from "vitest";

import {
	chipsForRole,
	DEFAULT_VOTE_CHIPS_BY_ROLE,
	leadingWorkIds,
	normalizeVoteChips,
	tallyScores,
	validateVoteAssignments,
} from "@/lib/clubs/session-voting";

describe("session voting helpers", () => {
	it("normalizes default chip sets and rejects duplicates", () => {
		expect(normalizeVoteChips(DEFAULT_VOTE_CHIPS_BY_ROLE)).toEqual(DEFAULT_VOTE_CHIPS_BY_ROLE);
		expect(normalizeVoteChips({ admin: [3, 1, 2], moderator: [1], member: [5, 2] })).toEqual({
			admin: [1, 2, 3],
			moderator: [1],
			member: [2, 5],
		});
		expect(normalizeVoteChips({ admin: [1, 1], moderator: [1], member: [1] })).toBeNull();
	});

	it("validates one chip per book and exact chip set usage", () => {
		const chips = [1, 2, 3];
		const shortlist = new Set(["OL1W", "OL2W", "OL3W", "OL4W"]);
		expect(
			validateVoteAssignments(
				[
					{ points: 1, workId: "OL1W" },
					{ points: 2, workId: "OL2W" },
					{ points: 3, workId: "OL3W" },
				],
				chips,
				shortlist,
			),
		).toBeNull();
		expect(
			validateVoteAssignments(
				[
					{ points: 1, workId: "OL1W" },
					{ points: 2, workId: "OL1W" },
					{ points: 3, workId: "OL3W" },
				],
				chips,
				shortlist,
			),
		).toMatch(/one of your chips/i);
		expect(validateVoteAssignments([{ points: 1, workId: "OL1W" }], chips, shortlist)).toMatch(
			/each of your/i,
		);
	});

	it("tallies scores and resolves plurality with ties", () => {
		const scores = tallyScores([
			{ workId: "OL1W", points: 3 },
			{ workId: "OL2W", points: 2 },
			{ workId: "OL1W", points: 1 },
			{ workId: "OL3W", points: 4 },
		]);
		expect(scores.get("OL1W")).toBe(4);
		expect(leadingWorkIds(["OL1W", "OL2W", "OL3W"], scores)).toEqual(["OL1W", "OL3W"]);
		expect(leadingWorkIds(["OL1W", "OL2W"], new Map())).toEqual(["OL1W", "OL2W"]);
	});

	it("picks chips for a member role", () => {
		expect(chipsForRole(DEFAULT_VOTE_CHIPS_BY_ROLE, "moderator")).toEqual([1, 2, 3]);
	});
});
