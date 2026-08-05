import { describe, expect, it } from "vitest";

import { canViewShelf } from "@/lib/shelves/visibility";

describe("canViewShelf", () => {
	const ownerUserId = "owner-1";

	it("lets the owner see every visibility", () => {
		for (const visibility of ["private", "followers_only", "public"] as const) {
			expect(canViewShelf({ visibility, ownerUserId, viewerUserId: ownerUserId })).toBe(true);
		}
	});

	it("hides private shelves from strangers", () => {
		expect(canViewShelf({ visibility: "private", ownerUserId, viewerUserId: "other" })).toBe(false);
		expect(canViewShelf({ visibility: "private", ownerUserId, viewerUserId: null })).toBe(false);
		expect(
			canViewShelf({
				visibility: "private",
				ownerUserId,
				viewerUserId: "other",
				viewerFollowsOwner: true,
			}),
		).toBe(false);
	});

	it("shows followers_only to accepted followers only", () => {
		expect(canViewShelf({ visibility: "followers_only", ownerUserId, viewerUserId: "other" })).toBe(
			false,
		);
		expect(
			canViewShelf({
				visibility: "followers_only",
				ownerUserId,
				viewerUserId: "other",
				viewerFollowsOwner: true,
			}),
		).toBe(true);
	});

	it("shows public shelves to anyone", () => {
		expect(canViewShelf({ visibility: "public", ownerUserId, viewerUserId: null })).toBe(true);
		expect(canViewShelf({ visibility: "public", ownerUserId, viewerUserId: "other" })).toBe(true);
	});
});
