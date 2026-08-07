import * as z from "zod";

import { base, paginated, paginationInputSchema } from "@/server/contracts/base.contract";

export const authorSearchItemSchema = z.object({
	authorId: z.string(),
	name: z.string(),
	birthDate: z.string().nullable(),
	deathDate: z.string().nullable(),
	topWork: z.string().nullable(),
	workCount: z.number().int().nullable(),
	photoUrl: z.string().nullable(),
});

export type AuthorSearchItem = z.infer<typeof authorSearchItemSchema>;

export const authorSearchResultSchema = z.object({
	items: z.array(authorSearchItemSchema),
	total: z.number().int().min(0),
});

export type AuthorSearchResult = z.infer<typeof authorSearchResultSchema>;

export const authorDetailSchema = z.object({
	authorId: z.string(),
	name: z.string(),
	bio: z.string().nullable(),
	birthDate: z.string().nullable(),
	deathDate: z.string().nullable(),
	alternateNames: z.array(z.string()),
	wikipedia: z.string().nullable(),
	photoUrl: z.string().nullable(),
	openLibraryUrl: z.string(),
});

export type AuthorDetail = z.infer<typeof authorDetailSchema>;

export const authorWorkSummarySchema = z.object({
	workId: z.string(),
	title: z.string(),
	coverUrl: z.string().nullable(),
	firstPublishDate: z.string().nullable(),
});

export type AuthorWorkSummary = z.infer<typeof authorWorkSummarySchema>;

export const searchAuthorsContract = base
	.route({
		method: "GET",
		path: "/author/search",
		tags: ["author"],
		summary: "Search Open Library authors",
	})
	.input(
		z.object({
			q: z.string().trim().min(1).max(200),
			limit: z.number().int().min(1).max(20).default(8),
		}),
	)
	.output(authorSearchResultSchema);

export const getAuthorContract = base
	.route({
		method: "GET",
		path: "/author/{authorId}",
		tags: ["author"],
		summary: "Get an author by Open Library author id",
	})
	.input(z.object({ authorId: z.string().trim().min(1) }))
	.output(authorDetailSchema);

export const listAuthorWorksContract = base
	.route({
		method: "GET",
		path: "/author/{authorId}/works",
		tags: ["author"],
		summary: "List works for an author",
	})
	.input(
		paginationInputSchema.extend({
			authorId: z.string().trim().min(1),
		}),
	)
	.output(paginated(authorWorkSummarySchema));

export const authorContract = {
	search: searchAuthorsContract,
	get: getAuthorContract,
	listWorks: listAuthorWorksContract,
};
