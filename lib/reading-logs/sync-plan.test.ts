import { describe, expect, it } from "vitest";

import { planReadingLogSync } from "@/lib/reading-logs/sync-plan";

describe("planReadingLogSync", () => {
	const now = new Date("2024-06-15T12:00:00.000Z");
	const earlier = new Date("2024-05-01T12:00:00.000Z");

	it("reuses an open reading log when moving to Reading", () => {
		const plan = planReadingLogSync({
			targetStatus: "reading",
			openLog: { id: "log-1", startedAt: earlier },
			hasPriorFinished: true,
			now,
		});

		expect(plan).toEqual({
			action: "update",
			logId: "log-1",
			status: "reading",
			startedAt: earlier,
			finishedAt: null,
		});
	});

	it("creates a re-read reading log when prior finished exists", () => {
		const plan = planReadingLogSync({
			targetStatus: "reading",
			openLog: null,
			hasPriorFinished: true,
			now,
		});

		expect(plan).toEqual({
			action: "insert",
			status: "reading",
			startedAt: now,
			finishedAt: null,
			isReread: true,
		});
	});

	it("closes an open reading log as completed", () => {
		const plan = planReadingLogSync({
			targetStatus: "completed",
			openLog: { id: "log-1", startedAt: earlier },
			hasPriorFinished: false,
			now,
		});

		expect(plan).toEqual({
			action: "update",
			logId: "log-1",
			status: "completed",
			startedAt: earlier,
			finishedAt: now,
		});
	});

	it("creates a completed log when none is open", () => {
		const plan = planReadingLogSync({
			targetStatus: "completed",
			openLog: null,
			hasPriorFinished: false,
			now,
		});

		expect(plan).toEqual({
			action: "insert",
			status: "completed",
			startedAt: now,
			finishedAt: now,
			isReread: false,
		});
	});

	it("marks a new dnf insert as re-read when prior finished exists", () => {
		const plan = planReadingLogSync({
			targetStatus: "dnf",
			openLog: null,
			hasPriorFinished: true,
			now,
		});

		expect(plan.action).toBe("insert");
		if (plan.action === "insert") {
			expect(plan.isReread).toBe(true);
			expect(plan.status).toBe("dnf");
		}
	});
});
