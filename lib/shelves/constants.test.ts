import { describe, expect, it } from "vitest";

import {
	RESERVED_SHELF_SLUGS,
	SYSTEM_SHELF_DEFINITIONS,
	SYSTEM_SHELF_KEYS,
} from "@/lib/shelves/constants";
import { slugify } from "@/lib/slugify";

describe("system shelves", () => {
	it("defines four reserved slugs matching system keys", () => {
		expect(SYSTEM_SHELF_KEYS).toHaveLength(4);
		expect(SYSTEM_SHELF_DEFINITIONS.map((d) => d.slug)).toEqual([...SYSTEM_SHELF_KEYS]);
		for (const definition of SYSTEM_SHELF_DEFINITIONS) {
			expect(RESERVED_SHELF_SLUGS.has(definition.slug)).toBe(true);
			expect(slugify(definition.name).length).toBeGreaterThan(0);
		}
	});
});
