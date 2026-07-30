import { oc } from "@orpc/contract";
import * as z from "zod";

import { commonErrors } from "@/server/contracts/errors";

/** Every contract builds on this so the shared error map is always present. */
export const base = oc.errors(commonErrors);

export const paginationInputSchema = z.object({
	limit: z.number().int().min(1).max(100).default(20),
	offset: z.number().int().min(0).default(0),
});

/** Offset pagination envelope; `nextOffset` is null on the last page. */
export function paginated<TItem extends z.ZodType>(item: TItem) {
	return z.object({
		items: z.array(item),
		total: z.number().int().min(0),
		nextOffset: z.number().int().min(0).nullable(),
	});
}
