import { normalizeWorkKey } from "@/lib/books/ids";
import {
	mapEditionDetail,
	mapEditionSummary,
	mapSearchWorkDoc,
	mapWorkDetail,
} from "@/lib/books/map";
import { isOpenLibraryError, olib } from "@/olib";
import { publicProcedure } from "@/server/procedures";

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

export const search = publicProcedure.book.search.handler(async ({ input, errors }) => {
	try {
		const response = await olib.search.works({
			q: input.q,
			limit: input.limit,
			fields: [...SEARCH_FIELDS],
		});

		return {
			items: response.docs.map(mapSearchWorkDoc),
			total: response.numFound ?? response.num_found ?? response.docs.length,
		};
	} catch (error) {
		if (isOpenLibraryError(error) && error.code === "RATE_LIMITED") {
			throw errors.RATE_LIMITED({
				message: error.message,
				data: { retryAfterSeconds: 30 },
			});
		}

		throw error;
	}
});

export const getWork = publicProcedure.book.getWork.handler(async ({ input, errors }) => {
	try {
		const work = await olib.works.get(input.workId);
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
	} catch (error) {
		if (isOpenLibraryError(error)) {
			if (error.code === "NOT_FOUND") {
				throw errors.NOT_FOUND({ message: "Book not found" });
			}

			if (error.code === "RATE_LIMITED") {
				throw errors.RATE_LIMITED({
					message: error.message,
					data: { retryAfterSeconds: 30 },
				});
			}
		}

		throw error;
	}
});

export const listWorkEditions = publicProcedure.book.listWorkEditions.handler(
	async ({ input, errors }) => {
		try {
			const response = await olib.works.editions(input.workId, {
				limit: input.limit,
				offset: input.offset,
			});

			const items = response.entries.map(mapEditionSummary);
			const total = response.size ?? items.length;
			const consumed = input.offset + items.length;

			return {
				items,
				total,
				nextOffset: consumed < total ? consumed : null,
			};
		} catch (error) {
			if (isOpenLibraryError(error)) {
				if (error.code === "NOT_FOUND") {
					throw errors.NOT_FOUND({ message: "Book not found" });
				}

				if (error.code === "RATE_LIMITED") {
					throw errors.RATE_LIMITED({
						message: error.message,
						data: { retryAfterSeconds: 30 },
					});
				}
			}

			throw error;
		}
	},
);

export const getEdition = publicProcedure.book.getEdition.handler(async ({ input, errors }) => {
	try {
		const edition = await olib.editions.get(input.editionId);
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
	} catch (error) {
		if (isOpenLibraryError(error)) {
			if (error.code === "NOT_FOUND") {
				throw errors.NOT_FOUND({ message: "Edition not found" });
			}

			if (error.code === "RATE_LIMITED") {
				throw errors.RATE_LIMITED({
					message: error.message,
					data: { retryAfterSeconds: 30 },
				});
			}
		}

		throw error;
	}
});

export const bookRouter = {
	search,
	getWork,
	listWorkEditions,
	getEdition,
};
