import type { OpenLibraryHttpClient } from "../client";
import { authorIdSchema, authorPath, parseOrThrow } from "../ids";
import {
	type Author,
	type AuthorWorksResponse,
	authorSchema,
	authorWorksResponseSchema,
	type ListAuthorWorksInput,
	listAuthorWorksInputSchema,
} from "../schemas/author";

export function createAuthorsResource(client: OpenLibraryHttpClient) {
	return {
		/** Fetch an author by OLID (`OL26320A` or `/authors/OL26320A`). */
		get: async (id: string, options: { signal?: AbortSignal } = {}): Promise<Author> => {
			const authorId = parseOrThrow(authorIdSchema, id, "author id");

			return client.getJson(authorSchema, {
				path: `${authorPath(authorId)}.json`,
				signal: options.signal,
			});
		},

		/** List works for an author. */
		works: async (
			id: string,
			input: ListAuthorWorksInput = {},
			options: { signal?: AbortSignal } = {},
		): Promise<AuthorWorksResponse> => {
			const authorId = parseOrThrow(authorIdSchema, id, "author id");
			const parsed = parseOrThrow(listAuthorWorksInputSchema, input, "authors.works input");

			return client.getJson(authorWorksResponseSchema, {
				path: `${authorPath(authorId)}/works.json`,
				query: {
					limit: parsed.limit,
					offset: parsed.offset,
				},
				signal: options.signal,
			});
		},
	};
}

export type AuthorsResource = ReturnType<typeof createAuthorsResource>;
