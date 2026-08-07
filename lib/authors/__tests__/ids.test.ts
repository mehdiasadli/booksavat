import { describe, expect, it } from "vitest";

import {
	authorOpenLibraryUrl,
	normalizeAuthorKey,
	toAuthorId,
	tryAuthorId,
} from "@/lib/authors/ids";

describe("author ids", () => {
	it("normalizes author keys", () => {
		expect(normalizeAuthorKey("/authors/OL26320A")).toBe("OL26320A");
		expect(normalizeAuthorKey("ol26320a")).toBe("OL26320A");
	});

	it("validates author OLIDs", () => {
		expect(toAuthorId("/authors/OL26320A")).toBe("OL26320A");
		expect(tryAuthorId("not-an-author")).toBeNull();
	});

	it("builds Open Library URLs", () => {
		expect(authorOpenLibraryUrl("OL26320A")).toBe("https://openlibrary.org/authors/OL26320A");
	});
});
