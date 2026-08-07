import "server-only";

import { unstable_cache } from "next/cache";

import { mapAuthorDetail, mapAuthorWorkSummary, mapSearchAuthorDoc } from "@/lib/authors/map";
import { isOpenLibraryError, olib } from "@/olib";
import type {
	AuthorDetail,
	AuthorSearchResult,
	AuthorWorkSummary,
} from "@/server/contracts/author.contract";

const SEARCH_CACHE_SECONDS = 60;

async function fetchSearchAuthors(q: string, limit: number): Promise<AuthorSearchResult> {
	const response = await olib.search.authors({ q, limit });
	const items = response.docs
		.map(mapSearchAuthorDoc)
		.filter((item): item is NonNullable<typeof item> => item != null);

	return {
		items,
		total: response.numFound ?? response.num_found ?? items.length,
	};
}

const getCachedSearchAuthors = unstable_cache(
	async (q: string, limit: number) => fetchSearchAuthors(q, limit),
	["author-search"],
	{ revalidate: SEARCH_CACHE_SECONDS },
);

export async function searchAuthors(q: string, limit: number): Promise<AuthorSearchResult> {
	return getCachedSearchAuthors(q.trim().toLowerCase(), limit);
}

export async function loadAuthor(authorId: string): Promise<AuthorDetail> {
	const author = await olib.authors.get(authorId);
	return mapAuthorDetail(author);
}

export async function listAuthorWorks(
	authorId: string,
	limit: number,
	offset: number,
): Promise<{ items: AuthorWorkSummary[]; total: number; nextOffset: number | null }> {
	const response = await olib.authors.works(authorId, { limit, offset });
	const items = response.entries
		.map(mapAuthorWorkSummary)
		.filter((item): item is AuthorWorkSummary => item != null);
	const total = response.size ?? items.length;
	const consumed = offset + items.length;

	return {
		items,
		total,
		nextOffset: consumed < total ? consumed : null,
	};
}

export function isAuthorNotFound(error: unknown): boolean {
	return isOpenLibraryError(error) && error.code === "NOT_FOUND";
}

export function isAuthorRateLimited(error: unknown): boolean {
	return isOpenLibraryError(error) && error.code === "RATE_LIMITED";
}

export function isAuthorUpstreamUnavailable(error: unknown): boolean {
	return (
		isOpenLibraryError(error) &&
		(error.code === "NETWORK_ERROR" ||
			error.code === "HTTP_ERROR" ||
			error.code === "INVALID_RESPONSE")
	);
}
