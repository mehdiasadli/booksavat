import { describe, expect, it } from "vitest";

import {
	canShowSessionReadingProgress,
	effectiveParticipantReadingStatus,
	summarizeParticipantReading,
} from "@/lib/clubs/session-reading";

describe("session reading helpers", () => {
	it("prefers override over derived log status", () => {
		expect(
			effectiveParticipantReadingStatus({
				overrideStatus: "completed",
				derivedStatus: "reading",
			}),
		).toBe("completed");
		expect(
			effectiveParticipantReadingStatus({
				overrideStatus: null,
				derivedStatus: "dnf",
			}),
		).toBe("dnf");
		expect(
			effectiveParticipantReadingStatus({
				overrideStatus: null,
				derivedStatus: null,
			}),
		).toBe("not_started");
	});

	it("shows progress only in pending/reading/reviewing", () => {
		expect(canShowSessionReadingProgress("reading")).toBe(true);
		expect(canShowSessionReadingProgress("voting")).toBe(false);
	});

	it("summarizes participant statuses", () => {
		expect(summarizeParticipantReading(["reading", "completed", "reading", "not_started"])).toEqual(
			{
				not_started: 1,
				reading: 2,
				completed: 1,
				dnf: 0,
			},
		);
	});
});
