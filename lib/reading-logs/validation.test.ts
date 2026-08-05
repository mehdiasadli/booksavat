import { describe, expect, it } from "vitest";

import {
	normalizeDatesForStatus,
	validateReadingLogDates,
	validateReadingLogReread,
} from "@/lib/reading-logs/validation";

describe("validateReadingLogDates", () => {
	const now = new Date("2024-06-15T12:00:00.000Z");
	const started = new Date("2024-01-01T12:00:00.000Z");
	const finished = new Date("2024-02-01T12:00:00.000Z");
	const future = new Date("2024-07-01T12:00:00.000Z");

	it("allows finished after started", () => {
		expect(
			validateReadingLogDates({
				status: "completed",
				startedAt: started,
				finishedAt: finished,
				now,
			}),
		).toBeNull();
	});

	it("rejects finished before started", () => {
		expect(
			validateReadingLogDates({
				status: "completed",
				startedAt: finished,
				finishedAt: started,
				now,
			}),
		).toMatch(/before/i);
	});

	it("rejects started date in the future", () => {
		expect(
			validateReadingLogDates({
				status: "reading",
				startedAt: future,
				finishedAt: null,
				now,
			}),
		).toMatch(/future/i);
	});

	it("rejects finished date while reading", () => {
		expect(
			validateReadingLogDates({
				status: "reading",
				startedAt: started,
				finishedAt: finished,
				now,
			}),
		).toMatch(/finished/i);
	});

	it("allows reading with started only", () => {
		expect(
			validateReadingLogDates({
				status: "reading",
				startedAt: started,
				finishedAt: null,
				now,
			}),
		).toBeNull();
	});
});

describe("validateReadingLogReread", () => {
	it("rejects re-read without a finished first read", () => {
		expect(
			validateReadingLogReread({
				isReread: true,
				hasPriorFinished: false,
				hasNonRereadFinished: false,
			}),
		).toMatch(/first finished/i);
	});

	it("rejects a second attempt without re-read", () => {
		expect(
			validateReadingLogReread({
				isReread: false,
				hasPriorFinished: true,
				hasNonRereadFinished: true,
			}),
		).toMatch(/re-read/i);
	});

	it("allows first finished read", () => {
		expect(
			validateReadingLogReread({
				isReread: false,
				hasPriorFinished: false,
				hasNonRereadFinished: false,
			}),
		).toBeNull();
	});

	it("allows re-read after a first finished read", () => {
		expect(
			validateReadingLogReread({
				isReread: true,
				hasPriorFinished: true,
				hasNonRereadFinished: true,
			}),
		).toBeNull();
	});

	it("allows editing an existing first finished log", () => {
		expect(
			validateReadingLogReread({
				isReread: false,
				hasPriorFinished: true,
				hasNonRereadFinished: true,
				isExistingFirstFinished: true,
			}),
		).toBeNull();
	});
});

describe("normalizeDatesForStatus", () => {
	const now = new Date("2024-06-15T12:00:00.000Z");

	it("clears finishedAt for reading and defaults startedAt", () => {
		expect(normalizeDatesForStatus("reading", null, now, now)).toEqual({
			startedAt: now,
			finishedAt: null,
		});
	});

	it("defaults both dates for completed", () => {
		expect(normalizeDatesForStatus("completed", null, null, now)).toEqual({
			startedAt: now,
			finishedAt: now,
		});
	});

	it("keeps an existing startedAt when finishing", () => {
		const started = new Date("2024-01-01T00:00:00.000Z");
		expect(normalizeDatesForStatus("dnf", started, null, now)).toEqual({
			startedAt: started,
			finishedAt: now,
		});
	});
});
