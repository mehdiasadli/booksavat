import * as z from "zod";

import { workIdSchema } from "@/olib/ids";
import { base, paginationInputSchema } from "@/server/contracts/base.contract";

export const shelfVisibilitySchema = z.enum(["private", "followers_only", "public"]);
export type ShelfVisibilityDto = z.infer<typeof shelfVisibilitySchema>;

export const shelfSystemKeySchema = z.enum(["wishlist", "reading", "completed", "dnf"]);
export type ShelfSystemKeyDto = z.infer<typeof shelfSystemKeySchema>;

export const shelfSummarySchema = z.object({
	id: z.uuid(),
	name: z.string(),
	slug: z.string(),
	description: z.string().nullable(),
	visibility: shelfVisibilitySchema,
	isSystem: z.boolean(),
	systemKey: shelfSystemKeySchema.nullable(),
	isOrdered: z.boolean(),
	position: z.number().int(),
	itemCount: z.number().int().min(0),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export type ShelfSummaryDto = z.infer<typeof shelfSummarySchema>;

export const shelfItemPreviewSchema = z.object({
	id: z.uuid(),
	workId: z.string(),
	position: z.number().int(),
	title: z.string(),
	coverUrl: z.string().nullable(),
	authors: z.array(z.string()),
	addedAt: z.date(),
});

export type ShelfItemPreviewDto = z.infer<typeof shelfItemPreviewSchema>;

export const listShelvesByUsernameContract = base
	.route({
		method: "GET",
		path: "/shelf/by-username/{username}",
		tags: ["shelf"],
		summary: "List shelves for a user (visibility-filtered)",
	})
	.input(z.object({ username: z.string().trim().min(1) }))
	.output(
		z.object({
			ownerUsername: z.string(),
			shelves: z.array(shelfSummarySchema),
			locked: z.boolean(),
		}),
	);

export const getShelfByUsernameAndSlugContract = base
	.route({
		method: "GET",
		path: "/shelf/by-username/{username}/{slug}",
		tags: ["shelf"],
		summary: "Get a shelf and its items",
	})
	.input(
		paginationInputSchema.extend({
			username: z.string().trim().min(1),
			slug: z.string().trim().min(1),
		}),
	)
	.output(
		z.object({
			ownerUsername: z.string(),
			shelf: shelfSummarySchema,
			items: z.array(shelfItemPreviewSchema),
			total: z.number().int().min(0),
			nextOffset: z.number().int().min(0).nullable(),
		}),
	);

export const createShelfContract = base
	.route({
		method: "POST",
		path: "/shelf",
		tags: ["shelf"],
		summary: "Create a custom shelf",
	})
	.input(
		z.object({
			name: z.string().trim().min(1).max(80),
			description: z.string().trim().max(500).nullable().optional(),
			visibility: shelfVisibilitySchema.default("private"),
			isOrdered: z.boolean().default(false),
		}),
	)
	.output(shelfSummarySchema);

export const updateShelfContract = base
	.route({
		method: "PATCH",
		path: "/shelf/{shelfId}",
		tags: ["shelf"],
		summary: "Update a shelf",
	})
	.input(
		z.object({
			shelfId: z.uuid(),
			name: z.string().trim().min(1).max(80).optional(),
			description: z.string().trim().max(500).nullable().optional(),
			visibility: shelfVisibilitySchema.optional(),
			isOrdered: z.boolean().optional(),
			regenerateSlug: z.boolean().optional(),
		}),
	)
	.output(shelfSummarySchema);

export const deleteShelfContract = base
	.route({
		method: "DELETE",
		path: "/shelf/{shelfId}",
		tags: ["shelf"],
		summary: "Delete a custom shelf",
	})
	.input(z.object({ shelfId: z.uuid() }))
	.output(z.object({ ok: z.literal(true) }));

export const addWorkContract = base
	.route({
		method: "POST",
		path: "/shelf/{shelfId}/works",
		tags: ["shelf"],
		summary: "Add a work to a shelf",
	})
	.input(
		z.object({
			shelfId: z.uuid(),
			workId: workIdSchema,
		}),
	)
	.output(shelfItemPreviewSchema);

export const removeWorkContract = base
	.route({
		method: "DELETE",
		path: "/shelf/{shelfId}/works/{workId}",
		tags: ["shelf"],
		summary: "Remove a work from a shelf",
	})
	.input(
		z.object({
			shelfId: z.uuid(),
			workId: workIdSchema,
		}),
	)
	.output(z.object({ ok: z.literal(true) }));

export const reorderItemsContract = base
	.route({
		method: "PUT",
		path: "/shelf/{shelfId}/items/order",
		tags: ["shelf"],
		summary: "Reorder items on an ordered shelf",
	})
	.input(
		z.object({
			shelfId: z.uuid(),
			workIds: z.array(workIdSchema).max(500),
		}),
	)
	.output(z.object({ ok: z.literal(true) }));

export const reorderShelvesContract = base
	.route({
		method: "PUT",
		path: "/shelf/order",
		tags: ["shelf"],
		summary: "Reorder the owner’s shelves",
	})
	.input(z.object({ shelfIds: z.array(z.uuid()).min(1).max(200) }))
	.output(z.object({ ok: z.literal(true) }));

export const membershipForWorkContract = base
	.route({
		method: "GET",
		path: "/shelf/membership/{workId}",
		tags: ["shelf"],
		summary: "Which of my shelves contain this work",
	})
	.input(z.object({ workId: workIdSchema }))
	.output(
		z.object({
			memberships: z.array(
				z.object({
					shelfId: z.uuid(),
					slug: z.string(),
					name: z.string(),
					isSystem: z.boolean(),
					systemKey: shelfSystemKeySchema.nullable(),
				}),
			),
		}),
	);

export const shelfContract = {
	listByUsername: listShelvesByUsernameContract,
	getByUsernameAndSlug: getShelfByUsernameAndSlugContract,
	create: createShelfContract,
	update: updateShelfContract,
	delete: deleteShelfContract,
	addWork: addWorkContract,
	removeWork: removeWorkContract,
	reorderItems: reorderItemsContract,
	reorderShelves: reorderShelvesContract,
	membershipForWork: membershipForWorkContract,
};
