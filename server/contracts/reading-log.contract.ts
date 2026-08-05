import * as z from "zod";

import { workIdSchema } from "@/olib/ids";
import { base, paginationInputSchema } from "@/server/contracts/base.contract";

export const readingLogStatusSchema = z.enum(["reading", "completed", "dnf"]);
export type ReadingLogStatusDto = z.infer<typeof readingLogStatusSchema>;

export const readingLogSchema = z.object({
	id: z.uuid(),
	workId: z.string(),
	status: readingLogStatusSchema,
	startedAt: z.date().nullable(),
	finishedAt: z.date().nullable(),
	isReread: z.boolean(),
	createdAt: z.date(),
	updatedAt: z.date(),
	title: z.string(),
	coverUrl: z.string().nullable(),
});

export type ReadingLogDto = z.infer<typeof readingLogSchema>;

export const listByUsernameContract = base
	.route({
		method: "GET",
		path: "/reading-log/by-username/{username}",
		tags: ["readingLog"],
		summary: "List reading logs for a user (owner-only diary)",
	})
	.input(
		paginationInputSchema.extend({
			username: z.string().trim().min(1),
		}),
	)
	.output(
		z.object({
			ownerUsername: z.string(),
			items: z.array(readingLogSchema),
			total: z.number().int().min(0),
			nextOffset: z.number().int().min(0).nullable(),
		}),
	);

export const getActiveForWorkContract = base
	.route({
		method: "GET",
		path: "/reading-log/active/{workId}",
		tags: ["readingLog"],
		summary: "Get my open or latest reading log for a work",
	})
	.input(z.object({ workId: workIdSchema }))
	.output(readingLogSchema.nullable());

export const listForWorkContract = base
	.route({
		method: "GET",
		path: "/reading-log/for-work/{workId}",
		tags: ["readingLog"],
		summary: "List all my reading attempts for a work",
	})
	.input(z.object({ workId: workIdSchema }))
	.output(z.object({ items: z.array(readingLogSchema) }));

export const updateReadingLogContract = base
	.route({
		method: "PATCH",
		path: "/reading-log/{logId}",
		tags: ["readingLog"],
		summary: "Update a reading log (dates, re-read, status)",
	})
	.input(
		z.object({
			logId: z.uuid(),
			status: readingLogStatusSchema.optional(),
			startedAt: z.date().nullable().optional(),
			finishedAt: z.date().nullable().optional(),
			isReread: z.boolean().optional(),
		}),
	)
	.output(readingLogSchema);

export const startRereadContract = base
	.route({
		method: "POST",
		path: "/reading-log/reread/{workId}",
		tags: ["readingLog"],
		summary: "Start a re-read (new reading log + Reading shelf)",
	})
	.input(z.object({ workId: workIdSchema }))
	.output(readingLogSchema);

export const readingLogContract = {
	listByUsername: listByUsernameContract,
	getActiveForWork: getActiveForWorkContract,
	listForWork: listForWorkContract,
	update: updateReadingLogContract,
	startReread: startRereadContract,
};
