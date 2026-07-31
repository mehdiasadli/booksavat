import { z } from "zod";

import { paginationInputSchema } from "./common";

const searchFieldsSchema = z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]);

export const searchWorksInputSchema = paginationInputSchema
	.extend({
		/** Solr query. Required. See https://openlibrary.org/dev/docs/api/search */
		q: z.string().trim().min(1),
		/** Comma-separated or array of Solr fields. Use `*` sparingly. */
		fields: searchFieldsSchema.optional(),
		/** Sort facet, e.g. `new`, `old`, `rating`, `editions`, `random`. */
		sort: z.string().trim().min(1).optional(),
		/**
		 * Prefer editions in this ISO 639-1 language (does not exclude other results).
		 * Distinct from embedding `language:fre` in `q`.
		 */
		lang: z
			.string()
			.trim()
			.length(2)
			.transform((value) => value.toLowerCase())
			.optional(),
		/** When true, include the nested `editions` sub-object in field selection. */
		includeEditions: z.boolean().optional(),
	})
	.strict()
	.refine((value) => !(value.page != null && value.offset != null), {
		message: "Provide either page or offset, not both",
		path: ["page"],
	});

export type SearchWorksInput = z.infer<typeof searchWorksInputSchema>;

export const searchAuthorsInputSchema = paginationInputSchema
	.extend({
		q: z.string().trim().min(1),
		sort: z.string().trim().min(1).optional(),
	})
	.strict()
	.refine((value) => !(value.page != null && value.offset != null), {
		message: "Provide either page or offset, not both",
		path: ["page"],
	});

export type SearchAuthorsInput = z.infer<typeof searchAuthorsInputSchema>;

export const searchEditionDocSchema = z
	.object({
		key: z.string().optional(),
		title: z.string().optional(),
		subtitle: z.string().optional(),
		isbn: z.array(z.string()).optional(),
		publisher: z.array(z.string()).optional(),
		language: z.array(z.string()).optional(),
		publish_date: z.string().optional(),
		ebook_access: z.string().optional(),
		cover_i: z.number().optional(),
	})
	.passthrough();

export const searchEditionsSubobjectSchema = z
	.object({
		numFound: z.number().optional(),
		start: z.number().optional(),
		numFoundExact: z.boolean().optional(),
		docs: z.array(searchEditionDocSchema).optional(),
	})
	.passthrough();

export const searchWorkDocSchema = z
	.object({
		key: z.string(),
		title: z.string().optional(),
		subtitle: z.string().optional(),
		author_name: z.array(z.string()).optional(),
		author_key: z.array(z.string()).optional(),
		cover_i: z.number().optional(),
		edition_count: z.number().optional(),
		first_publish_year: z.number().optional(),
		has_fulltext: z.boolean().optional(),
		public_scan_b: z.boolean().optional(),
		ia: z.array(z.string()).optional(),
		language: z.array(z.string()).optional(),
		isbn: z.array(z.string()).optional(),
		publisher: z.array(z.string()).optional(),
		subject: z.array(z.string()).optional(),
		editions: searchEditionsSubobjectSchema.optional(),
	})
	.passthrough();

export type SearchWorkDoc = z.infer<typeof searchWorkDocSchema>;

export const searchWorksResponseSchema = z
	.object({
		numFound: z.number().optional(),
		num_found: z.number().optional(),
		start: z.number().optional(),
		numFoundExact: z.boolean().optional(),
		q: z.string().optional(),
		offset: z.number().nullable().optional(),
		documentation_url: z.string().optional(),
		docs: z.array(searchWorkDocSchema).default([]),
	})
	.passthrough();

export type SearchWorksResponse = z.infer<typeof searchWorksResponseSchema>;

export const searchAuthorDocSchema = z
	.object({
		key: z.string(),
		name: z.string().optional(),
		alternate_names: z.array(z.string()).optional(),
		birth_date: z.string().optional(),
		death_date: z.string().optional(),
		top_work: z.string().optional(),
		work_count: z.number().optional(),
		top_subjects: z.array(z.string()).optional(),
		type: z.string().optional(),
		ratings_average: z.number().optional(),
		ratings_count: z.number().optional(),
	})
	.passthrough();

export type SearchAuthorDoc = z.infer<typeof searchAuthorDocSchema>;

export const searchAuthorsResponseSchema = z
	.object({
		numFound: z.number().optional(),
		num_found: z.number().optional(),
		start: z.number().optional(),
		numFoundExact: z.boolean().optional(),
		docs: z.array(searchAuthorDocSchema).default([]),
	})
	.passthrough();

export type SearchAuthorsResponse = z.infer<typeof searchAuthorsResponseSchema>;

export function toSearchQueryParams(
	input: SearchWorksInput | SearchAuthorsInput,
	options: { includeEditions?: boolean } = {},
): Record<string, string> {
	const params: Record<string, string> = { q: input.q };

	if (input.limit != null) {
		params.limit = String(input.limit);
	}
	if (input.offset != null) {
		params.offset = String(input.offset);
	}
	if (input.page != null) {
		params.page = String(input.page);
	}
	if ("sort" in input && input.sort) {
		params.sort = input.sort;
	}
	if ("lang" in input && input.lang) {
		params.lang = input.lang;
	}

	if ("fields" in input || "includeEditions" in input) {
		const includeEditions =
			options.includeEditions ?? ("includeEditions" in input ? input.includeEditions : undefined);
		const fields = normalizeFields("fields" in input ? input.fields : undefined, includeEditions);

		if (fields) {
			params.fields = fields;
		}
	}

	return params;
}

const DEFAULT_WORK_FIELDS_WITH_EDITIONS = [
	"key",
	"title",
	"author_name",
	"author_key",
	"cover_i",
	"edition_count",
	"first_publish_year",
	"editions",
	"editions.key",
	"editions.title",
	"editions.isbn",
	"editions.cover_i",
];

function normalizeFields(
	fields: string | string[] | undefined,
	includeEditions: boolean | undefined,
): string | undefined {
	const list = fields == null ? [] : Array.isArray(fields) ? [...fields] : fields.split(",");
	const normalized = list.map((field) => field.trim()).filter(Boolean);

	if (normalized.length === 0) {
		return includeEditions ? DEFAULT_WORK_FIELDS_WITH_EDITIONS.join(",") : undefined;
	}

	if (
		includeEditions &&
		!normalized.some(
			(field) => field === "*" || field === "editions" || field.startsWith("editions."),
		)
	) {
		normalized.push("editions");
	}

	return normalized.join(",");
}
