import { describe, expect, it } from "vitest";

import { isValidFeedbackRating, parseFeedbackRating } from "@/lib/feedback/rating";

describe("feedback rating", () => {
	it("allows half-star steps from 0 to 5", () => {
		for (const value of [0, 0.5, 1, 2.5, 4.5, 5]) {
			expect(isValidFeedbackRating(value)).toBe(true);
		}
	});

	it("rejects out of range and odd steps", () => {
		expect(isValidFeedbackRating(-0.5)).toBe(false);
		expect(isValidFeedbackRating(5.5)).toBe(false);
		expect(isValidFeedbackRating(1.25)).toBe(false);
	});

	it("parses numeric strings", () => {
		expect(parseFeedbackRating("3.5")).toBe(3.5);
		expect(parseFeedbackRating("3.25")).toBeNull();
	});
});
