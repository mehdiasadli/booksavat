import {
	isBookNotFound,
	isBookRateLimited,
	isBookUpstreamUnavailable,
	loadEdition,
	loadWork,
	loadWorkEditions,
	searchBooks,
} from "@/lib/books/service.server";
import { isOpenLibraryError } from "@/olib";
import { publicProcedure } from "@/server/procedures";

function rethrowBookError(
	error: unknown,
	errors: {
		NOT_FOUND: (payload: { message: string }) => Error;
		RATE_LIMITED: (payload: { message?: string; data: { retryAfterSeconds: number } }) => Error;
		UPSTREAM_UNAVAILABLE: (payload: { message: string }) => Error;
	},
	notFoundMessage: string,
): never {
	if (isBookNotFound(error)) {
		throw errors.NOT_FOUND({ message: notFoundMessage });
	}

	if (isBookRateLimited(error) && isOpenLibraryError(error)) {
		throw errors.RATE_LIMITED({
			message: error.message,
			data: { retryAfterSeconds: 30 },
		});
	}

	if (isBookUpstreamUnavailable(error)) {
		throw errors.UPSTREAM_UNAVAILABLE({
			message: "Open Library is temporarily unavailable. Try again in a moment.",
		});
	}

	throw error;
}

export const search = publicProcedure.book.search.handler(async ({ input, errors }) => {
	try {
		return await searchBooks(input.q, input.limit);
	} catch (error) {
		rethrowBookError(error, errors, "Book not found");
	}
});

export const getWork = publicProcedure.book.getWork.handler(async ({ input, errors }) => {
	try {
		return await loadWork(input.workId);
	} catch (error) {
		rethrowBookError(error, errors, "Book not found");
	}
});

export const listWorkEditions = publicProcedure.book.listWorkEditions.handler(
	async ({ input, errors }) => {
		try {
			return await loadWorkEditions(input.workId, input.limit, input.offset);
		} catch (error) {
			rethrowBookError(error, errors, "Book not found");
		}
	},
);

export const getEdition = publicProcedure.book.getEdition.handler(async ({ input, errors }) => {
	try {
		return await loadEdition(input.editionId);
	} catch (error) {
		rethrowBookError(error, errors, "Edition not found");
	}
});

export const bookRouter = {
	search,
	getWork,
	listWorkEditions,
	getEdition,
};
