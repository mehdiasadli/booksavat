import type { OpenLibraryHttpClient } from "../client";
import { editionIdSchema, editionPath, isbnSchema, parseOrThrow } from "../ids";
import { type Edition, editionSchema } from "../schemas/edition";

export function createEditionsResource(client: OpenLibraryHttpClient) {
	return {
		/** Fetch an edition by OLID (`OL44247403M` or `/books/OL44247403M`). */
		get: async (id: string, options: { signal?: AbortSignal } = {}): Promise<Edition> => {
			const editionId = parseOrThrow(editionIdSchema, id, "edition id");

			return client.getJson(editionSchema, {
				path: `${editionPath(editionId)}.json`,
				signal: options.signal,
			});
		},

		/**
		 * Fetch an edition by ISBN-10 or ISBN-13.
		 * Open Library redirects `/isbn/{isbn}.json` → `/books/{OLID}.json`.
		 */
		byIsbn: async (isbn: string, options: { signal?: AbortSignal } = {}): Promise<Edition> => {
			const normalizedIsbn = parseOrThrow(isbnSchema, isbn, "isbn");

			return client.getJson(editionSchema, {
				path: `/isbn/${normalizedIsbn}.json`,
				signal: options.signal,
			});
		},
	};
}

export type EditionsResource = ReturnType<typeof createEditionsResource>;
