import { z } from "zod";

import {
	datetimeValueSchema,
	linksSchema,
	paginationInputSchema,
	textValueSchema,
	typeKeySchema,
} from "./common";
import { editionSchema } from "./edition";

export const workAuthorRoleSchema = z
	.object({
		author: z.object({ key: z.string() }).passthrough().optional(),
		type: typeKeySchema.optional(),
	})
	.passthrough();

export const workSchema = z
	.object({
		key: z.string(),
		title: z.string().optional(),
		subtitle: z.string().optional(),
		description: textValueSchema.optional(),
		authors: z.array(workAuthorRoleSchema).optional(),
		covers: z.array(z.number()).optional(),
		subjects: z.array(z.string()).optional(),
		subject_places: z.array(z.string()).optional(),
		subject_times: z.array(z.string()).optional(),
		subject_people: z.array(z.string()).optional(),
		first_publish_date: z.string().optional(),
		type: typeKeySchema.optional(),
		latest_revision: z.number().optional(),
		revision: z.number().optional(),
		created: datetimeValueSchema.optional(),
		last_modified: datetimeValueSchema.optional(),
	})
	.passthrough();

export type Work = z.infer<typeof workSchema>;

export const listWorkEditionsInputSchema = paginationInputSchema.omit({ page: true }).strict();

export type ListWorkEditionsInput = z.infer<typeof listWorkEditionsInputSchema>;

export const workEditionsResponseSchema = z
	.object({
		links: linksSchema.optional(),
		size: z.number().optional(),
		entries: z.array(editionSchema).default([]),
	})
	.passthrough();

export type WorkEditionsResponse = z.infer<typeof workEditionsResponseSchema>;
