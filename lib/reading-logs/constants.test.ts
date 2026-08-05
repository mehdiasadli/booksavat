import { describe, expect, it } from "vitest";

import {
	isLoggableSystemKey,
	LOGGABLE_SYSTEM_KEYS,
	systemKeyToLogStatus,
} from "@/lib/reading-logs/constants";

describe("reading log constants", () => {
	it("treats reading/completed/dnf as loggable", () => {
		for (const key of LOGGABLE_SYSTEM_KEYS) {
			expect(isLoggableSystemKey(key)).toBe(true);
			expect(systemKeyToLogStatus(key)).toBe(key);
		}
	});

	it("excludes wishlist", () => {
		expect(isLoggableSystemKey("wishlist")).toBe(false);
		expect(isLoggableSystemKey(null)).toBe(false);
	});
});
