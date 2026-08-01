import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";

import {
	isBookNotFound,
	loadEdition,
	loadWork,
	loadWorkEditions,
} from "@/lib/books/service.server";
import type { BookEditionDetail, BookWorkDetail } from "@/server/contracts/book.contract";

const REVALIDATE_SECONDS = 60 * 60; // 1 hour

/**
 * Cache Open Library reads directly (not via the oRPC SSR client).
 * `unstable_cache` cannot call `headers()` / session, which the oRPC server
 * context needs — so detail pages use this path instead.
 */
const getCachedWork = unstable_cache(
	async (workId: string): Promise<BookWorkDetail | null> => {
		try {
			return await loadWork(workId);
		} catch (error) {
			if (isBookNotFound(error)) {
				return null;
			}
			throw error;
		}
	},
	["book-work"],
	{ revalidate: REVALIDATE_SECONDS },
);

const getCachedEdition = unstable_cache(
	async (editionId: string): Promise<BookEditionDetail | null> => {
		try {
			return await loadEdition(editionId);
		} catch (error) {
			if (isBookNotFound(error)) {
				return null;
			}
			throw error;
		}
	},
	["book-edition"],
	{ revalidate: REVALIDATE_SECONDS },
);

const getCachedWorkEditions = unstable_cache(
	async (workId: string, limit: number) => {
		try {
			return await loadWorkEditions(workId, limit, 0);
		} catch (error) {
			if (isBookNotFound(error)) {
				return { items: [], total: 0, nextOffset: null };
			}
			throw error;
		}
	},
	["book-work-editions"],
	{ revalidate: REVALIDATE_SECONDS },
);

/** Deduped per-request + cached across requests for an hour. */
export const getBookWork = cache(async (workId: string) => getCachedWork(workId));

export const getBookEdition = cache(async (editionId: string) => getCachedEdition(editionId));

export const listBookEditions = cache(async (workId: string, limit = 12) =>
	getCachedWorkEditions(workId, limit),
);
