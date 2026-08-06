import { describe, expect, it } from "vitest";

import {
	buildDiscussionTree,
	canPostSessionDiscussion,
	canViewSessionDiscussion,
	isSessionDiscussionReaction,
	nextDiscussionDepth,
	SESSION_DISCUSSION_MAX_DEPTH,
} from "@/lib/clubs/session-discussion";

describe("session discussion helpers", () => {
	it("gates posting and viewing by session status", () => {
		expect(canPostSessionDiscussion("reviewing")).toBe(true);
		expect(canPostSessionDiscussion("completed")).toBe(false);
		expect(canViewSessionDiscussion("completed")).toBe(true);
		expect(canViewSessionDiscussion("reading")).toBe(false);
	});

	it("caps reply depth at max depth", () => {
		expect(nextDiscussionDepth(null)).toBe(0);
		expect(nextDiscussionDepth(SESSION_DISCUSSION_MAX_DEPTH - 1)).toBe(
			SESSION_DISCUSSION_MAX_DEPTH,
		);
		expect(nextDiscussionDepth(SESSION_DISCUSSION_MAX_DEPTH)).toBeNull();
	});

	it("validates reaction allowlist", () => {
		expect(isSessionDiscussionReaction("👍")).toBe(true);
		expect(isSessionDiscussionReaction("🚀")).toBe(false);
	});

	it("builds a nested reply tree", () => {
		const tree = buildDiscussionTree([
			{ id: "a", parentId: null, depth: 0 },
			{ id: "b", parentId: "a", depth: 1 },
			{ id: "c", parentId: "a", depth: 1 },
			{ id: "d", parentId: "b", depth: 2 },
		]);
		expect(tree).toHaveLength(1);
		expect(tree[0]?.id).toBe("a");
		expect(tree[0]?.replies.map((r) => r.id)).toEqual(["b", "c"]);
		expect(tree[0]?.replies[0]?.replies.map((r) => r.id)).toEqual(["d"]);
	});
});
