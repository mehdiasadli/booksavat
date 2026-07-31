import { describe, expect, it, vi } from "vitest";

import { createOpenLibrary } from "./create";
import { OpenLibraryError } from "./errors";

describe("createOpenLibrary", () => {
	it("exposes typed resources that hit the HTTP client", async () => {
		const fetchMock = vi.fn(async () =>
			Response.json({
				key: "/works/OL45804W",
				title: "Fantastic Mr Fox",
			}),
		);

		const client = createOpenLibrary({
			userAgent: "TestApp",
			contact: "test@example.com",
			fetch: fetchMock as unknown as typeof fetch,
		});

		const work = await client.works.get("OL45804W");

		expect(work.title).toBe("Fantastic Mr Fox");
		expect(fetchMock).toHaveBeenCalledOnce();
	});

	it("rejects invalid input before fetching", async () => {
		const fetchMock = vi.fn();
		const client = createOpenLibrary({
			userAgent: "TestApp",
			contact: "test@example.com",
			fetch: fetchMock as unknown as typeof fetch,
		});

		await expect(client.search.works({ q: "" })).rejects.toBeInstanceOf(OpenLibraryError);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
