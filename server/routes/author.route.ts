import {
	isAuthorNotFound,
	isAuthorRateLimited,
	isAuthorUpstreamUnavailable,
	listAuthorWorks,
	loadAuthor,
	searchAuthors,
} from "@/lib/authors/service.server";
import { isOpenLibraryError } from "@/olib";
import { publicProcedure } from "@/server/procedures";

function rethrowAuthorError(
	error: unknown,
	errors: {
		NOT_FOUND: (payload: { message: string }) => Error;
		RATE_LIMITED: (payload: { message?: string; data: { retryAfterSeconds: number } }) => Error;
		UPSTREAM_UNAVAILABLE: (payload: { message: string }) => Error;
	},
	notFoundMessage: string,
): never {
	if (isAuthorNotFound(error)) {
		throw errors.NOT_FOUND({ message: notFoundMessage });
	}

	if (isAuthorRateLimited(error) && isOpenLibraryError(error)) {
		throw errors.RATE_LIMITED({
			message: error.message,
			data: { retryAfterSeconds: 30 },
		});
	}

	if (isAuthorUpstreamUnavailable(error)) {
		throw errors.UPSTREAM_UNAVAILABLE({
			message: "Open Library is temporarily unavailable. Try again in a moment.",
		});
	}

	throw error;
}

export const search = publicProcedure.author.search.handler(async ({ input, errors }) => {
	try {
		return await searchAuthors(input.q, input.limit);
	} catch (error) {
		rethrowAuthorError(error, errors, "Author not found");
	}
});

export const get = publicProcedure.author.get.handler(async ({ input, errors }) => {
	try {
		return await loadAuthor(input.authorId);
	} catch (error) {
		rethrowAuthorError(error, errors, "Author not found");
	}
});

export const listWorks = publicProcedure.author.listWorks.handler(async ({ input, errors }) => {
	try {
		return await listAuthorWorks(input.authorId, input.limit, input.offset);
	} catch (error) {
		rethrowAuthorError(error, errors, "Author not found");
	}
});

export const authorRouter = {
	search,
	get,
	listWorks,
};
