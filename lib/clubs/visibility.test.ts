import { describe, expect, it } from "vitest";

import {
	canDiscoverClub,
	canInvite,
	canRemoveMember,
	canViewClubContent,
} from "@/lib/clubs/visibility";

describe("club visibility", () => {
	it("lets active members see invite_only content", () => {
		expect(
			canViewClubContent({
				visibility: "invite_only",
				membership: { role: "member", status: "active" },
			}),
		).toBe(true);
	});

	it("hides invite_only from strangers", () => {
		expect(canDiscoverClub({ visibility: "invite_only", membership: null })).toBe(false);
		expect(canViewClubContent({ visibility: "invite_only", membership: null })).toBe(false);
	});

	it("shows private headers but not content to strangers", () => {
		expect(canDiscoverClub({ visibility: "private", membership: null })).toBe(true);
		expect(canViewClubContent({ visibility: "private", membership: null })).toBe(false);
	});

	it("allows public join-side visibility", () => {
		expect(canViewClubContent({ visibility: "public", membership: null })).toBe(true);
	});

	it("lets mods invite and remove members only", () => {
		const mod = { role: "moderator" as const, status: "active" as const };
		expect(canInvite(mod)).toBe(true);
		expect(canRemoveMember(mod, { role: "member", status: "active" })).toBe(true);
		expect(canRemoveMember(mod, { role: "moderator", status: "active" })).toBe(false);
		expect(canRemoveMember(mod, { role: "admin", status: "active" })).toBe(false);
	});
});
