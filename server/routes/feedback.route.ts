import { deleteFeedback, getFeedbackForWork, upsertFeedback } from "@/lib/feedback/service.server";
import { protectedProcedure } from "@/server/procedures";

export const getForWork = protectedProcedure.feedback.getForWork.handler(
	async ({ input, context }) => {
		return getFeedbackForWork(context.db, context.viewer.user.id, input.workId);
	},
);

export const upsert = protectedProcedure.feedback.upsert.handler(
	async ({ input, context, errors }) => {
		const result = await upsertFeedback(context.db, context.viewer.user.id, {
			workId: input.workId,
			rating: input.rating,
			review: input.review,
		});

		if (!result.ok) {
			throw errors.FORBIDDEN({ message: result.message });
		}

		return result.feedback;
	},
);

export const deleteFeedbackRoute = protectedProcedure.feedback.delete.handler(
	async ({ input, context, errors }) => {
		const ok = await deleteFeedback(context.db, context.viewer.user.id, input.workId);
		if (!ok) {
			throw errors.NOT_FOUND({ message: "Feedback not found" });
		}
		return { ok: true as const };
	},
);

export const feedbackRouter = {
	getForWork,
	upsert,
	delete: deleteFeedbackRoute,
};
