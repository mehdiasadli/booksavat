import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";

import { isAuthorNotFound, listAuthorWorks, loadAuthor } from "@/lib/authors/service.server";
import type { AuthorDetail, AuthorWorkSummary } from "@/server/contracts/author.contract";

const REVALIDATE_SECONDS = 60 * 60; // 1 hour

const getCachedAuthor = unstable_cache(
	async (authorId: string): Promise<AuthorDetail | null> => {
		try {
			return await loadAuthor(authorId);
		} catch (error) {
			if (isAuthorNotFound(error)) {
				return null;
			}
			throw error;
		}
	},
	["author-detail"],
	{ revalidate: REVALIDATE_SECONDS },
);

const getCachedAuthorWorks = unstable_cache(
	async (
		authorId: string,
		limit: number,
	): Promise<{ items: AuthorWorkSummary[]; total: number; nextOffset: number | null }> => {
		try {
			return await listAuthorWorks(authorId, limit, 0);
		} catch (error) {
			if (isAuthorNotFound(error)) {
				return { items: [], total: 0, nextOffset: null };
			}
			throw error;
		}
	},
	["author-works"],
	{ revalidate: REVALIDATE_SECONDS },
);

/** Deduped per-request + cached across requests for an hour. */
export const getAuthor = cache(async (authorId: string) => getCachedAuthor(authorId));

export const listAuthorWorksCached = cache(async (authorId: string, limit = 24) =>
	getCachedAuthorWorks(authorId, limit),
);
