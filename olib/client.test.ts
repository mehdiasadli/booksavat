import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { OpenLibraryHttpClient } from "./client";
import type { OpenLibraryError } from "./errors";

describe("OpenLibraryHttpClient", () => {
	it("sends identified User-Agent and parses JSON", async () => {
		const fetchMock = vi.fn(async () =>
			Response.json({
				key: "/works/OL45804W",
				title: "Fantastic Mr Fox",
			}),
		);

		const client = new OpenLibraryHttpClient({
			userAgent: "TestApp",
			contact: "test@example.com",
			fetch: fetchMock as unknown as typeof fetch,
		});

		const work = await client.getJson(z.object({ key: z.string(), title: z.string().optional() }), {
			path: "/works/OL45804W.json",
		});

		expect(work.title).toBe("Fantastic Mr Fox");
		expect(fetchMock).toHaveBeenCalledOnce();

		const call = fetchMock.mock.calls[0];
		expect(call).toBeDefined();
		const [url, init] = call as unknown as [string, RequestInit];
		expect(url).toBe("https://openlibrary.org/works/OL45804W.json");
		expect(new Headers(init.headers).get("User-Agent")).toBe("TestApp (test@example.com)");
	});

	it("maps 404 to NOT_FOUND", async () => {
		const client = new OpenLibraryHttpClient({
			userAgent: "TestApp",
			contact: "test@example.com",
			fetch: vi.fn(async () => new Response(null, { status: 404 })) as unknown as typeof fetch,
		});

		await expect(
			client.getJson(z.object({ key: z.string() }), { path: "/works/OL0W.json" }),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
		} satisfies Partial<OpenLibraryError>);
	});
});
