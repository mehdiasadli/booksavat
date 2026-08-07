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
function parsePositiveInt(value: string | undefined, fallback: number): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function parseNonNegativeInt(value: string | undefined, fallback: number): number {
	if (value === undefined || value === "") {
		return fallback;
	}

	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

export const olib = createOpenLibrary({
	userAgent: process.env.OLIB_USER_AGENT ?? "BookSavat",
	contact: process.env.OLIB_CONTACT ?? "hello@booksavat.app",
	/** Fail under undici's ~10s connect timeout so search UI does not hang. */
	timeoutMs: parsePositiveInt(process.env.OLIB_TIMEOUT_MS, 6_000),
	/** One quick retry for transient connect/timeout failures. */
	retries: parseNonNegativeInt(process.env.OLIB_RETRIES, 1),
});
