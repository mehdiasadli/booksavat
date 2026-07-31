import { z } from "zod";

/** OL often wraps values as `{ type, value }` or returns a plain string. */
export const textValueSchema = z.union([
	z.string(),
	z
		.object({
			type: z.union([z.string(), z.object({ key: z.string() }).passthrough()]).optional(),
			value: z.string(),
		})
		.passthrough(),
]);

export type TextValue = z.infer<typeof textValueSchema>;

export function unwrapTextValue(value: TextValue | undefined | null): string | undefined {
	if (value == null) {
		return undefined;
	}

	return typeof value === "string" ? value : value.value;
}

export const typeKeySchema = z.object({ key: z.string() }).passthrough();

export const datetimeValueSchema = z
	.object({
		type: z.union([z.string(), typeKeySchema]).optional(),
		value: z.string(),
	})
	.passthrough();

export const paginationInputSchema = z
	.object({
		limit: z.number().int().positive().max(1000).optional(),
		offset: z.number().int().nonnegative().optional(),
		page: z.number().int().positive().optional(),
	})
	.strict();

export type PaginationInput = z.infer<typeof paginationInputSchema>;

/** Links object returned by editions/works list endpoints. */
export const linksSchema = z
	.object({
		self: z.string().optional(),
		work: z.string().optional(),
		author: z.string().optional(),
		next: z.string().optional(),
		prev: z.string().optional(),
	})
	.passthrough();
