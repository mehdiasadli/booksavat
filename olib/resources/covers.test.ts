import { describe, expect, it } from "vitest";

import { createCoversResource } from "./covers";

describe("covers url builders", () => {
	const covers = createCoversResource();

	it("builds book cover urls", () => {
		expect(
			covers.bookUrl({
				key: "isbn",
				value: "0385472579",
				size: "S",
			}),
		).toBe("https://covers.openlibrary.org/b/isbn/0385472579-S.jpg");
	});

	it("disables default blank image when requested", () => {
		expect(
			covers.bookUrl({
				key: "olid",
				value: "OL44247403M",
				size: "L",
				defaultImage: false,
			}),
		).toBe("https://covers.openlibrary.org/b/olid/OL44247403M-L.jpg?default=false");
	});

	it("builds author photo urls", () => {
		expect(
			covers.authorUrl({
				key: "olid",
				value: "OL23919A",
				size: "M",
			}),
		).toBe("https://covers.openlibrary.org/a/olid/OL23919A-M.jpg");
	});
});
