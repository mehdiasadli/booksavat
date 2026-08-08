import { describe, expect, it } from "vitest";

import {
	canAddToBooklist,
	canModerateBooklistProposals,
	canProposeToBooklist,
	canRemoveFromBooklist,
	canUploadBooklistPdf,
} from "@/lib/clubs/booklist-permissions";
import { DEFAULT_CLUB_BOOKLIST_SETTINGS } from "@/lib/clubs/constants";

const settings = DEFAULT_CLUB_BOOKLIST_SETTINGS;
const admin = { role: "admin" as const, status: "active" as const };
const mod = { role: "moderator" as const, status: "active" as const };
const member = { role: "member" as const, status: "active" as const };

describe("club booklist permissions", () => {
	it("defaults: mods can add, members cannot; both can propose when they cannot add", () => {
		expect(canAddToBooklist(admin, settings)).toBe(true);
		expect(canAddToBooklist(mod, settings)).toBe(true);
		expect(canAddToBooklist(member, settings)).toBe(false);

		expect(canProposeToBooklist(admin, settings)).toBe(false);
		expect(canProposeToBooklist(mod, settings)).toBe(false);
		expect(canProposeToBooklist(member, settings)).toBe(true);
	});

	it("defaults: neither mod nor member can remove; admin can", () => {
		expect(canRemoveFromBooklist(admin, settings)).toBe(true);
		expect(canRemoveFromBooklist(mod, settings)).toBe(false);
		expect(canRemoveFromBooklist(member, settings)).toBe(false);
	});

	it("lets members add when toggle is on, and then they no longer propose", () => {
		const open = { ...settings, membersCanAdd: true };
		expect(canAddToBooklist(member, open)).toBe(true);
		expect(canProposeToBooklist(member, open)).toBe(false);
	});

	it("blocks propose when canPropose is off", () => {
		const closed = { ...settings, membersCanPropose: false };
		expect(canProposeToBooklist(member, closed)).toBe(false);
	});

	it("lets mods remove when toggle is on", () => {
		const open = { ...settings, modsCanRemove: true };
		expect(canRemoveFromBooklist(mod, open)).toBe(true);
		expect(canRemoveFromBooklist(member, open)).toBe(false);
	});

	it("only admin moderates proposals", () => {
		expect(canModerateBooklistProposals(admin)).toBe(true);
		expect(canModerateBooklistProposals(mod)).toBe(false);
		expect(canModerateBooklistProposals(member)).toBe(false);
		expect(canModerateBooklistProposals(null)).toBe(false);
	});

	it("requires active membership", () => {
		expect(canAddToBooklist({ role: "admin", status: "invited" }, settings)).toBe(false);
		expect(canAddToBooklist(null, settings)).toBe(false);
	});

	it("defaults: admin and mods can upload PDFs; members cannot", () => {
		expect(canUploadBooklistPdf(admin, settings)).toBe(true);
		expect(canUploadBooklistPdf(mod, settings)).toBe(true);
		expect(canUploadBooklistPdf(member, settings)).toBe(false);
	});

	it("lets members upload PDFs when toggle is on", () => {
		const open = { ...settings, membersCanUploadPdf: true };
		expect(canUploadBooklistPdf(member, open)).toBe(true);
	});
});
