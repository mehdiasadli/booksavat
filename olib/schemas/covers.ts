import { z } from "zod";

export const coverSizeSchema = z.enum(["S", "M", "L"]);

export type CoverSize = z.infer<typeof coverSizeSchema>;

export const bookCoverKeySchema = z.enum(["isbn", "oclc", "lccn", "olid", "id"]);

export type BookCoverKey = z.infer<typeof bookCoverKeySchema>;

export const bookCoverInputSchema = z
	.object({
		key: bookCoverKeySchema,
		value: z.union([z.string().trim().min(1), z.number().int()]),
		size: coverSizeSchema.default("M"),
		/** When false, covers.openlibrary.org returns 404 instead of a blank image. */
		defaultImage: z.boolean().default(true),
	})
	.strict();

/** Call-site input (defaults applied during parse). */
export type BookCoverInput = z.input<typeof bookCoverInputSchema>;
export type BookCover = z.output<typeof bookCoverInputSchema>;

export const authorCoverKeySchema = z.enum(["olid", "id"]);

export const authorCoverInputSchema = z
	.object({
		key: authorCoverKeySchema,
		value: z.union([z.string().trim().min(1), z.number().int()]),
		size: coverSizeSchema.default("M"),
		defaultImage: z.boolean().default(true),
	})
	.strict();

/** Call-site input (defaults applied during parse). */
export type AuthorCoverInput = z.input<typeof authorCoverInputSchema>;
export type AuthorCover = z.output<typeof authorCoverInputSchema>;
