import type { OpenLibraryHttpClient } from "../client";
import { parseOrThrow, workIdSchema, workPath } from "../ids";
import {
	type ListWorkEditionsInput,
	listWorkEditionsInputSchema,
	type Work,
	type WorkEditionsResponse,
	workEditionsResponseSchema,
	workSchema,
} from "../schemas/work";

export function createWorksResource(client: OpenLibraryHttpClient) {
	return {
		/** Fetch a work by OLID (`OL45804W` or `/works/OL45804W`). */
		get: async (id: string, options: { signal?: AbortSignal } = {}): Promise<Work> => {
			const workId = parseOrThrow(workIdSchema, id, "work id");

			return client.getJson(workSchema, {
				path: `${workPath(workId)}.json`,
				signal: options.signal,
			});
		},

		/**
		 * List editions of a work.
		 * @see https://openlibrary.org/dev/docs/restful_api
		 */
		editions: async (
			id: string,
			input: ListWorkEditionsInput = {},
			options: { signal?: AbortSignal } = {},
		): Promise<WorkEditionsResponse> => {
			const workId = parseOrThrow(workIdSchema, id, "work id");
			const parsed = parseOrThrow(listWorkEditionsInputSchema, input, "works.editions input");

			return client.getJson(workEditionsResponseSchema, {
				path: `${workPath(workId)}/editions.json`,
				query: {
					limit: parsed.limit,
					offset: parsed.offset,
				},
				signal: options.signal,
			});
		},
	};
}

export type WorksResource = ReturnType<typeof createWorksResource>;
