import { z } from "zod";

import { datetimeValueSchema, textValueSchema, typeKeySchema } from "./common";

export const editionAuthorRefSchema = z
	.object({
		key: z.string(),
	})
	.passthrough();

export const editionSchema = z
	.object({
		key: z.string(),
		title: z.string().optional(),
		subtitle: z.string().optional(),
		full_title: z.string().optional(),
		description: textValueSchema.optional(),
		authors: z.array(editionAuthorRefSchema).optional(),
		works: z.array(z.object({ key: z.string() }).passthrough()).optional(),
		isbn_10: z.array(z.string()).optional(),
		isbn_13: z.array(z.string()).optional(),
		publishers: z.array(z.string()).optional(),
		publish_date: z.string().optional(),
		publish_places: z.array(z.string()).optional(),
		number_of_pages: z.number().optional(),
		pagination: z.string().optional(),
		weight: z.string().optional(),
		physical_format: z.string().optional(),
		languages: z.array(typeKeySchema).optional(),
		covers: z.array(z.number()).optional(),
		subjects: z.array(z.string()).optional(),
		identifiers: z.record(z.string(), z.array(z.string())).optional(),
		source_records: z.array(z.string()).optional(),
		oclc_numbers: z.array(z.string()).optional(),
		lccn: z.array(z.string()).optional(),
		ocaid: z.string().optional(),
		type: typeKeySchema.optional(),
		latest_revision: z.number().optional(),
		revision: z.number().optional(),
		created: datetimeValueSchema.optional(),
		last_modified: datetimeValueSchema.optional(),
	})
	.passthrough();

export type Edition = z.infer<typeof editionSchema>;
