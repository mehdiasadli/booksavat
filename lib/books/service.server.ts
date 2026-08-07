import "server-only";

import { unstable_cache } from "next/cache";

import { normalizeWorkKey } from "@/lib/books/ids";
import {
	mapEditionDetail,
	mapEditionSummary,
	mapSearchWorkDoc,
	mapWorkDetail,
} from "@/lib/books/map";
import { isOpenLibraryError, olib } from "@/olib";
import type {
	BookEditionDetail,
	BookEditionSummary,
	BookSearchResult,
	BookWorkDetail,
} from "@/server/contracts/book.contract";

const SEARCH_FIELDS = [
	"key",
	"title",
	"subtitle",
	"author_name",
	"cover_i",
	"edition_count",
	"first_publish_year",
	"isbn",
	"subject",
	"publisher",
	"first_sentence",
] as const;

const SEARCH_CACHE_SECONDS = 60;

async function fetchSearchBooks(q: string, limit: number): Promise<BookSearchResult> {
	const response = await olib.search.works({
		q,
		limit,
		fields: [...SEARCH_FIELDS],
	});

	return {
		items: response.docs.map(mapSearchWorkDoc),
		total: response.numFound ?? response.num_found ?? response.docs.length,
	};
}

/** Short TTL cache so repeated queries skip flaky Open Library round-trips. */
const getCachedSearchBooks = unstable_cache(
	async (q: string, limit: number) => fetchSearchBooks(q, limit),
	["book-search"],
	{ revalidate: SEARCH_CACHE_SECONDS },
);

export async function searchBooks(q: string, limit: number): Promise<BookSearchResult> {
	return getCachedSearchBooks(q.trim().toLowerCase(), limit);
}

export async function loadWork(workId: string): Promise<BookWorkDetail> {
	const work = await olib.works.get(workId);
	const authorKeys = (work.authors ?? [])
		.map((entry) => entry.author?.key)
		.filter((key): key is string => Boolean(key));

	const [authorNames, editions] = await Promise.all([
		Promise.all(
			authorKeys.slice(0, 8).map(async (key) => {
				try {
					const author = await olib.authors.get(key);
					return author.name?.trim() || null;
				} catch {
					return null;
				}
			}),
		),
		olib.works.editions(work.key, { limit: 1 }).catch(() => null),
	]);

	return mapWorkDetail(work, {
		authorNames: authorNames.filter((name): name is string => Boolean(name)),
		editionCount: editions?.size ?? null,
	});
}

export async function loadWorkEditions(
	workId: string,
	limit: number,
	offset: number,
): Promise<{ items: BookEditionSummary[]; total: number; nextOffset: number | null }> {
	const response = await olib.works.editions(workId, { limit, offset });
	const items = response.entries.map(mapEditionSummary);
	const total = response.size ?? items.length;
	const consumed = offset + items.length;

	return {
		items,
		total,
		nextOffset: consumed < total ? consumed : null,
	};
}

export async function loadEdition(editionId: string): Promise<BookEditionDetail> {
	const edition = await olib.editions.get(editionId);
	const workKey = edition.works?.[0]?.key;
	let workTitle: string | null = null;

	if (workKey) {
		try {
			const work = await olib.works.get(normalizeWorkKey(workKey));
			workTitle = work.title?.trim() || null;
		} catch {
			workTitle = null;
		}
	}

	return mapEditionDetail(edition, { workTitle });
}

export function isBookNotFound(error: unknown): boolean {
	return isOpenLibraryError(error) && error.code === "NOT_FOUND";
}

export function isBookRateLimited(error: unknown): boolean {
	return isOpenLibraryError(error) && error.code === "RATE_LIMITED";
}

export function isBookUpstreamUnavailable(error: unknown): boolean {
	return (
		isOpenLibraryError(error) &&
		(error.code === "NETWORK_ERROR" ||
			error.code === "HTTP_ERROR" ||
			error.code === "INVALID_RESPONSE")
	);
}
