import type { OpenLibraryHttpClient } from "../client";
import { parseOrThrow } from "../ids";
import {
	type SearchAuthorsInput,
	type SearchAuthorsResponse,
	type SearchWorksInput,
	type SearchWorksResponse,
	searchAuthorsInputSchema,
	searchAuthorsResponseSchema,
	searchWorksInputSchema,
	searchWorksResponseSchema,
	toSearchQueryParams,
} from "../schemas/search";

export function createSearchResource(client: OpenLibraryHttpClient) {
	return {
		/**
		 * Search works (and optionally nested matching editions).
		 * @see https://openlibrary.org/dev/docs/api/search
		 */
		works: async (
			input: SearchWorksInput,
			options: { signal?: AbortSignal } = {},
		): Promise<SearchWorksResponse> => {
			const parsed = parseOrThrow(searchWorksInputSchema, input, "search.works input");

			return client.getJson(searchWorksResponseSchema, {
				path: "/search.json",
				query: toSearchQueryParams(parsed),
				signal: options.signal,
				notFoundAsError: false,
			});
		},

		/**
		 * Search authors.
		 * @see https://openlibrary.org/dev/docs/api/authors
		 */
		authors: async (
			input: SearchAuthorsInput,
			options: { signal?: AbortSignal } = {},
		): Promise<SearchAuthorsResponse> => {
			const parsed = parseOrThrow(searchAuthorsInputSchema, input, "search.authors input");

			return client.getJson(searchAuthorsResponseSchema, {
				path: "/search/authors.json",
				query: toSearchQueryParams(parsed),
				signal: options.signal,
				notFoundAsError: false,
			});
		},
	};
}

export type SearchResource = ReturnType<typeof createSearchResource>;
