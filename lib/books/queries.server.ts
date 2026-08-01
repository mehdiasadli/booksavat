import "server-only";

import { toORPCError } from "@orpc/client";
import { unstable_cache } from "next/cache";
import { cache } from "react";

import { orpc } from "@/lib/orpc";
import type { BookEditionDetail, BookWorkDetail } from "@/server/contracts/book.contract";

const REVALIDATE_SECONDS = 60 * 60; // 1 hour

async function fetchWork(workId: string): Promise<BookWorkDetail | null> {
	try {
		return await orpc.book.getWork.call({ workId });
	} catch (error) {
		const orpcError = toORPCError(error);
		if (orpcError.code === "NOT_FOUND") {
			return null;
		}
		throw orpcError;
	}
}

async function fetchEdition(editionId: string): Promise<BookEditionDetail | null> {
	try {
		return await orpc.book.getEdition.call({ editionId });
	} catch (error) {
		const orpcError = toORPCError(error);
		if (orpcError.code === "NOT_FOUND") {
			return null;
		}
		throw orpcError;
	}
}

const getCachedWork = unstable_cache(fetchWork, ["book-work"], {
	revalidate: REVALIDATE_SECONDS,
});

const getCachedEdition = unstable_cache(fetchEdition, ["book-edition"], {
	revalidate: REVALIDATE_SECONDS,
});

/** Deduped per-request + cached across requests for an hour. */
export const getBookWork = cache(async (workId: string) => getCachedWork(workId));

export const getBookEdition = cache(async (editionId: string) => getCachedEdition(editionId));

export const listBookEditions = cache(async (workId: string, limit = 12) => {
	try {
		return await orpc.book.listWorkEditions.call({ workId, limit, offset: 0 });
	} catch (error) {
		const orpcError = toORPCError(error);
		if (orpcError.code === "NOT_FOUND") {
			return { items: [], total: 0, nextOffset: null };
		}
		throw orpcError;
	}
});
