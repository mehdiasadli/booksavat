import { z } from "zod";

import {
	datetimeValueSchema,
	linksSchema,
	paginationInputSchema,
	textValueSchema,
	typeKeySchema,
} from "./common";
import { workSchema } from "./work";

export const authorSchema = z
	.object({
		key: z.string(),
		name: z.string().optional(),
		personal_name: z.string().optional(),
		alternate_names: z.array(z.string()).optional(),
		bio: textValueSchema.optional(),
		birth_date: z.string().optional(),
		death_date: z.string().optional(),
		photos: z.array(z.number()).optional(),
		remote_ids: z.record(z.string(), z.string()).optional(),
		wikipedia: z.string().optional(),
		links: z
			.array(
				z
					.object({
						title: z.string().optional(),
						url: z.string().optional(),
						type: typeKeySchema.optional(),
					})
					.passthrough(),
			)
			.optional(),
		type: typeKeySchema.optional(),
		latest_revision: z.number().optional(),
		revision: z.number().optional(),
		created: datetimeValueSchema.optional(),
		last_modified: datetimeValueSchema.optional(),
	})
	.passthrough();

export type Author = z.infer<typeof authorSchema>;

export const listAuthorWorksInputSchema = paginationInputSchema.omit({ page: true }).strict();

export type ListAuthorWorksInput = z.infer<typeof listAuthorWorksInputSchema>;

export const authorWorksResponseSchema = z
	.object({
		links: linksSchema.optional(),
		size: z.number().optional(),
		entries: z.array(workSchema).default([]),
	})
	.passthrough();

export type AuthorWorksResponse = z.infer<typeof authorWorksResponseSchema>;
