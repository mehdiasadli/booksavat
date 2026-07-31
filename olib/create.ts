import { type OpenLibraryClientOptions, OpenLibraryHttpClient } from "./client";
import { createAuthorsResource } from "./resources/authors";
import { createCoversResource } from "./resources/covers";
import { createEditionsResource } from "./resources/editions";
import { createSearchResource } from "./resources/search";
import { createWorksResource } from "./resources/works";

export type CreateOpenLibraryOptions = OpenLibraryClientOptions;

export function createOpenLibrary(options: CreateOpenLibraryOptions) {
	const client = new OpenLibraryHttpClient(options);

	return {
		search: createSearchResource(client),
		works: createWorksResource(client),
		editions: createEditionsResource(client),
		authors: createAuthorsResource(client),
		covers: createCoversResource(),
	} as const;
}

export type OpenLibrary = ReturnType<typeof createOpenLibrary>;
