import * as z from "zod";

import { workIdSchema } from "@/olib/ids";
import { base } from "@/server/contracts/base.contract";

const richTextDocumentSchema = z.record(z.string(), z.unknown());

export const feedbackSchema = z.object({
	id: z.uuid(),
	workId: z.string(),
	rating: z.number(),
	review: richTextDocumentSchema.nullable(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export type FeedbackDto = z.infer<typeof feedbackSchema>;

export const getForWorkContract = base
	.route({
		method: "GET",
		path: "/feedback/for-work/{workId}",
		tags: ["feedback"],
		summary: "Get my feedback for a work",
	})
	.input(z.object({ workId: workIdSchema }))
	.output(feedbackSchema.nullable());

export const upsertFeedbackContract = base
	.route({
		method: "PUT",
		path: "/feedback/for-work/{workId}",
		tags: ["feedback"],
		summary: "Create or update my feedback for a work",
	})
	.input(
		z.object({
			workId: workIdSchema,
			rating: z.number().min(0).max(5),
			review: richTextDocumentSchema.nullable().optional(),
		}),
	)
	.output(feedbackSchema);

export const deleteFeedbackContract = base
	.route({
		method: "DELETE",
		path: "/feedback/for-work/{workId}",
		tags: ["feedback"],
		summary: "Delete my feedback for a work",
	})
	.input(z.object({ workId: workIdSchema }))
	.output(z.object({ ok: z.literal(true) }));

export const feedbackContract = {
	getForWork: getForWorkContract,
	upsert: upsertFeedbackContract,
	delete: deleteFeedbackContract,
};
