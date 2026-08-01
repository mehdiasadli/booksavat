import { describe, expect, it } from "vitest";

import { normalizeEditionKey, normalizeWorkKey, tryEditionId, tryWorkId } from "@/lib/books/ids";

describe("book ids", () => {
	it("normalizes work and edition keys", () => {
		expect(normalizeWorkKey("/works/OL45804W")).toBe("OL45804W");
		expect(normalizeEditionKey("/books/OL7353617M")).toBe("OL7353617M");
	});

	it("validates OLIDs", () => {
		expect(tryWorkId("OL45804W")).toBe("OL45804W");
		expect(tryWorkId("not-a-work")).toBeNull();
		expect(tryEditionId("OL7353617M")).toBe("OL7353617M");
		expect(tryEditionId("OL45804W")).toBeNull();
	});
});
