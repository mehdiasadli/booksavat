import * as z from "zod";

import { base, paginated, paginationInputSchema } from "@/server/contracts/base.contract";

/** App-facing search hit — not a raw Open Library document. */
export const bookSearchItemSchema = z.object({
	workId: z.string(),
	title: z.string(),
	subtitle: z.string().nullable(),
	authors: z.array(z.string()),
	coverUrl: z.string().nullable(),
	firstPublishYear: z.number().int().nullable(),
	subjects: z.array(z.string()),
	isbns: z.array(z.string()),
	editionCount: z.number().int().nullable(),
	excerpt: z.string().nullable(),
});

export type BookSearchItem = z.infer<typeof bookSearchItemSchema>;

export const bookSearchResultSchema = z.object({
	items: z.array(bookSearchItemSchema),
	total: z.number().int().min(0),
});

export type BookSearchResult = z.infer<typeof bookSearchResultSchema>;

export const bookEditionSummarySchema = z.object({
	editionId: z.string(),
	title: z.string(),
	subtitle: z.string().nullable(),
	coverUrl: z.string().nullable(),
	publishDate: z.string().nullable(),
	publishers: z.array(z.string()),
	isbn10: z.array(z.string()),
	isbn13: z.array(z.string()),
	pageCount: z.number().int().nullable(),
	languages: z.array(z.string()),
});

export type BookEditionSummary = z.infer<typeof bookEditionSummarySchema>;

export const bookWorkDetailSchema = z.object({
	workId: z.string(),
	title: z.string(),
	subtitle: z.string().nullable(),
	description: z.string().nullable(),
	coverUrl: z.string().nullable(),
	authors: z.array(z.string()),
	subjects: z.array(z.string()),
	subjectPlaces: z.array(z.string()),
	subjectTimes: z.array(z.string()),
	subjectPeople: z.array(z.string()),
	firstPublishDate: z.string().nullable(),
	editionCount: z.number().int().nullable(),
	openLibraryUrl: z.string(),
});

export type BookWorkDetail = z.infer<typeof bookWorkDetailSchema>;

export const bookEditionDetailSchema = bookEditionSummarySchema.extend({
	description: z.string().nullable(),
	physicalFormat: z.string().nullable(),
	pagination: z.string().nullable(),
	weight: z.string().nullable(),
	publishPlaces: z.array(z.string()),
	workId: z.string().nullable(),
	workTitle: z.string().nullable(),
	openLibraryUrl: z.string(),
});

export type BookEditionDetail = z.infer<typeof bookEditionDetailSchema>;

export const searchBooksContract = base
	.route({
		method: "GET",
		path: "/book/search",
		tags: ["book"],
		summary: "Search Open Library works",
	})
	.input(
		z.object({
			q: z.string().trim().min(1).max(200),
			limit: z.number().int().min(1).max(20).default(8),
		}),
	)
	.output(bookSearchResultSchema);

export const getWorkContract = base
	.route({
		method: "GET",
		path: "/book/works/{workId}",
		tags: ["book"],
		summary: "Get a work by Open Library work id",
	})
	.input(z.object({ workId: z.string().trim().min(1) }))
	.output(bookWorkDetailSchema);

export const listWorkEditionsContract = base
	.route({
		method: "GET",
		path: "/book/works/{workId}/editions",
		tags: ["book"],
		summary: "List editions for a work",
	})
	.input(
		paginationInputSchema.extend({
			workId: z.string().trim().min(1),
		}),
	)
	.output(paginated(bookEditionSummarySchema));

export const getEditionContract = base
	.route({
		method: "GET",
		path: "/book/editions/{editionId}",
		tags: ["book"],
		summary: "Get an edition by Open Library edition id",
	})
	.input(z.object({ editionId: z.string().trim().min(1) }))
	.output(bookEditionDetailSchema);

export const bookContract = {
	search: searchBooksContract,
	getWork: getWorkContract,
	listWorkEditions: listWorkEditionsContract,
	getEdition: getEditionContract,
};
