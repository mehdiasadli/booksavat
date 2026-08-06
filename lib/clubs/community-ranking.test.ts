import { describe, expect, it } from "vitest";

import {
	ageHours,
	engagementScore,
	hotScore,
	topRangeStart,
	truncateSlug,
} from "@/lib/clubs/community-ranking";

describe("engagementScore", () => {
	it("weights reactions, comments, and replies", () => {
		expect(
			engagementScore({
				reactionCount: 2,
				commentCount: 1,
				replyCount: 2,
			}),
		).toBe(2 * 1 + 1 * 3 + 2 * 2);
	});
});

describe("hotScore", () => {
	it("decays with age", () => {
		const now = new Date("2026-08-06T12:00:00.000Z");
		const fresh = hotScore(
			{ reactionCount: 10, commentCount: 0, replyCount: 0 },
			new Date("2026-08-06T11:00:00.000Z"),
			now,
		);
		const old = hotScore(
			{ reactionCount: 10, commentCount: 0, replyCount: 0 },
			new Date("2026-08-01T12:00:00.000Z"),
			now,
		);
		expect(fresh).toBeGreaterThan(old);
	});
});

describe("ageHours", () => {
	it("never goes negative", () => {
		const now = new Date("2026-01-01T00:00:00.000Z");
		expect(ageHours(new Date("2026-01-02T00:00:00.000Z"), now)).toBe(0);
	});
});

describe("topRangeStart", () => {
	it("returns null for all", () => {
		expect(topRangeStart("all")).toBeNull();
	});

	it("returns start of today for today", () => {
		const now = new Date("2026-08-06T15:30:00.000Z");
		const start = topRangeStart("today", now);
		expect(start?.getHours()).toBe(0);
		expect(start?.getDate()).toBe(6);
	});
});

describe("truncateSlug", () => {
	it("trims trailing underscores after cut", () => {
		expect(truncateSlug("hello_world_extra", 11)).toBe("hello_world");
	});

	it("leaves short slugs alone", () => {
		expect(truncateSlug("short", 48)).toBe("short");
	});
});
