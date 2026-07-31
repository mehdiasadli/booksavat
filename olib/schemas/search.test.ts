import { describe, expect, it } from "vitest";

import { searchWorksInputSchema, toSearchQueryParams } from "./search";

describe("search query params", () => {
	it("maps core search params", () => {
		const input = searchWorksInputSchema.parse({
			q: "lord of the rings",
			limit: 10,
			page: 2,
			sort: "new",
			lang: "EN",
			fields: ["key", "title"],
		});

		expect(toSearchQueryParams(input)).toEqual({
			q: "lord of the rings",
			limit: "10",
			page: "2",
			sort: "new",
			lang: "en",
			fields: "key,title",
		});
	});

	it("adds editions fields when includeEditions is set without fields", () => {
		const input = searchWorksInputSchema.parse({
			q: "fox",
			includeEditions: true,
		});

		const params = toSearchQueryParams(input);

		expect(params.fields).toContain("editions");
		expect(params.fields).toContain("title");
	});

	it("rejects page and offset together", () => {
		expect(() =>
			searchWorksInputSchema.parse({
				q: "fox",
				page: 1,
				offset: 10,
			}),
		).toThrow();
	});
});
