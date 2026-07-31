import { createOpenLibrary } from "./create";

export { type CreateOpenLibraryOptions, createOpenLibrary, type OpenLibrary } from "./create";
export { isOpenLibraryError, OpenLibraryError, type OpenLibraryErrorCode } from "./errors";
export type { Author, AuthorWorksResponse, ListAuthorWorksInput } from "./schemas/author";
export { unwrapTextValue } from "./schemas/common";
export type { AuthorCoverInput, BookCoverInput, CoverSize } from "./schemas/covers";
export type { Edition } from "./schemas/edition";
export type {
	SearchAuthorDoc,
	SearchAuthorsInput,
	SearchAuthorsResponse,
	SearchWorkDoc,
	SearchWorksInput,
	SearchWorksResponse,
} from "./schemas/search";
export type { ListWorkEditionsInput, Work, WorkEditionsResponse } from "./schemas/work";

/**
 * App-ready Open Library client.
 *
 * Identifies requests with User-Agent so Open Library can apply the higher
 * rate limit (3 rps). Override via `OLIB_USER_AGENT` / `OLIB_CONTACT`.
 *
 * @example
 * ```ts
 * const results = await olib.search.works({ q: "lord of the rings", limit: 5 });
 * const work = await olib.works.get(results.docs[0].key);
 * const editions = await olib.works.editions(work.key, { limit: 20 });
 * const cover = olib.covers.bookUrl({ key: "olid", value: "OL44247403M", size: "L" });
 * ```
 */
export const olib = createOpenLibrary({
	userAgent: process.env.OLIB_USER_AGENT ?? "BookSavat",
	contact: process.env.OLIB_CONTACT ?? "hello@booksavat.app",
});
