import { describe, expect, it } from "vitest";

import { OpenLibraryError } from "./errors";
import { authorIdSchema, editionIdSchema, isbnSchema, parseOrThrow, workIdSchema } from "./ids";

describe("olib ids", () => {
	it("normalizes work ids", () => {
		expect(parseOrThrow(workIdSchema, "/works/OL45804W", "work")).toBe("OL45804W");
		expect(parseOrThrow(workIdSchema, "ol45804w", "work")).toBe("OL45804W");
	});

	it("normalizes edition and author ids", () => {
		expect(parseOrThrow(editionIdSchema, "/books/OL44247403M", "edition")).toBe("OL44247403M");
		expect(parseOrThrow(authorIdSchema, "/authors/OL26320A", "author")).toBe("OL26320A");
	});

	it("normalizes isbn values", () => {
		expect(parseOrThrow(isbnSchema, "978-0-14-241822-2", "isbn")).toBe("9780142418222");
		expect(parseOrThrow(isbnSchema, "0-306-40615-2", "isbn")).toBe("0306406152");
	});

	it("rejects invalid ids", () => {
		expect(() => parseOrThrow(workIdSchema, "not-a-work", "work")).toThrow(OpenLibraryError);
		expect(() => parseOrThrow(isbnSchema, "123", "isbn")).toThrow(OpenLibraryError);
	});
});
