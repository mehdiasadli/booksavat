import { describe, expect, it } from "vitest";

import { canViewProfileContent } from "@/lib/follows/visibility";

describe("canViewProfileContent", () => {
	const ownerUserId = "owner-1";

	it("lets the owner always see content", () => {
		expect(
			canViewProfileContent({
				isPrivate: true,
				ownerUserId,
				viewerUserId: ownerUserId,
			}),
		).toBe(true);
	});

	it("lets anyone see public accounts", () => {
		expect(
			canViewProfileContent({
				isPrivate: false,
				ownerUserId,
				viewerUserId: null,
			}),
		).toBe(true);
	});

	it("hides private accounts from non-followers", () => {
		expect(
			canViewProfileContent({
				isPrivate: true,
				ownerUserId,
				viewerUserId: "other",
				viewerFollowsOwner: false,
			}),
		).toBe(false);
	});

	it("shows private accounts to accepted followers", () => {
		expect(
			canViewProfileContent({
				isPrivate: true,
				ownerUserId,
				viewerUserId: "other",
				viewerFollowsOwner: true,
			}),
		).toBe(true);
	});
});
