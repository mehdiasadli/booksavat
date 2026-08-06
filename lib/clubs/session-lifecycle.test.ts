import { describe, expect, it } from "vitest";

import {
	advanceRequiresSelectedWork,
	canAbandonSession,
	canCancelSession,
	canJoinOrLeaveSession,
	isLiveSessionStatus,
	isTerminalSessionStatus,
	nextAdvanceStatus,
} from "@/lib/clubs/session-lifecycle";

describe("reading session lifecycle", () => {
	it("advances along the happy path", () => {
		expect(nextAdvanceStatus("proposed")).toBe("voting");
		expect(nextAdvanceStatus("voting")).toBe("pending");
		expect(nextAdvanceStatus("pending")).toBe("reading");
		expect(nextAdvanceStatus("reading")).toBe("reviewing");
		expect(nextAdvanceStatus("reviewing")).toBe("completed");
		expect(nextAdvanceStatus("completed")).toBeNull();
		expect(nextAdvanceStatus("cancelled")).toBeNull();
	});

	it("marks live vs terminal statuses", () => {
		expect(isLiveSessionStatus("reading")).toBe(true);
		expect(isLiveSessionStatus("completed")).toBe(false);
		expect(isTerminalSessionStatus("abandoned")).toBe(true);
		expect(isTerminalSessionStatus("voting")).toBe(false);
	});

	it("allows join/leave only before deadline in pre-reading stages", () => {
		const future = new Date(Date.now() + 60_000);
		const past = new Date(Date.now() - 60_000);
		expect(canJoinOrLeaveSession({ status: "proposed", joinDeadline: future })).toBe(true);
		expect(canJoinOrLeaveSession({ status: "voting", joinDeadline: future })).toBe(true);
		expect(canJoinOrLeaveSession({ status: "pending", joinDeadline: future })).toBe(true);
		expect(canJoinOrLeaveSession({ status: "reading", joinDeadline: future })).toBe(false);
		expect(canJoinOrLeaveSession({ status: "proposed", joinDeadline: past })).toBe(false);
	});

	it("gates cancel and abandon by status", () => {
		expect(canCancelSession("proposed")).toBe(true);
		expect(canCancelSession("reading")).toBe(false);
		expect(canAbandonSession("reading")).toBe(true);
		expect(canAbandonSession("pending")).toBe(false);
	});

	it("requires a selected work when leaving voting", () => {
		expect(advanceRequiresSelectedWork("voting")).toBe(true);
		expect(advanceRequiresSelectedWork("proposed")).toBe(false);
	});
});
