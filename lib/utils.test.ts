import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
	it("joins class names", () => {
		expect(cn("inline-flex", "font-medium")).toBe("inline-flex font-medium");
	});

	it("keeps the last of conflicting tailwind utilities", () => {
		expect(cn("px-2", "px-4")).toBe("px-4");
	});

	it("ignores falsy values", () => {
		expect(cn("px-2", false, null, undefined, "")).toBe("px-2");
	});

	it("accepts arrays and conditional objects", () => {
		expect(cn(["px-2", { hidden: false, flex: true }])).toBe("px-2 flex");
	});
});
