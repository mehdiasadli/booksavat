import {
	getActiveReadingLogForWork,
	listReadingLogsByUsername,
	listReadingLogsForWork,
	startReread,
	updateReadingLog,
} from "@/lib/reading-logs/service.server";
import { ensureSystemShelves } from "@/lib/shelves/system.server";
import { protectedProcedure, publicProcedure } from "@/server/procedures";

export const listByUsername = publicProcedure.readingLog.listByUsername.handler(
	async ({ input, context, errors }) => {
		const result = await listReadingLogsByUsername(
			context.db,
			input.username,
			context.session?.user?.id,
			{ limit: input.limit, offset: input.offset },
		);

		if (!result) {
			throw errors.NOT_FOUND({ message: "Diary not found" });
		}

		return result;
	},
);

export const getActiveForWork = protectedProcedure.readingLog.getActiveForWork.handler(
	async ({ input, context }) => {
		return getActiveReadingLogForWork(context.db, context.viewer.user.id, input.workId);
	},
);

export const listForWork = protectedProcedure.readingLog.listForWork.handler(
	async ({ input, context }) => {
		const items = await listReadingLogsForWork(context.db, context.viewer.user.id, input.workId);
		return { items };
	},
);

export const update = protectedProcedure.readingLog.update.handler(
	async ({ input, context, errors }) => {
		const { logId, ...patch } = input;
		const result = await updateReadingLog(context.db, context.viewer.user.id, logId, patch);

		if (!result.ok) {
			if (result.error === "not_found") {
				throw errors.NOT_FOUND({ message: "Reading log not found" });
			}
			throw errors.FORBIDDEN({ message: result.message ?? "Invalid reading log update" });
		}

		return result.log;
	},
);

export const startRereadRoute = protectedProcedure.readingLog.startReread.handler(
	async ({ input, context, errors }) => {
		await ensureSystemShelves(context.db, context.viewer.user.id);
		const log = await startReread(context.db, context.viewer.user.id, input.workId);

		if (!log) {
			throw errors.NOT_FOUND({ message: "Could not start re-read" });
		}

		return log;
	},
);

export const readingLogRouter = {
	listByUsername,
	getActiveForWork,
	listForWork,
	update,
	startReread: startRereadRoute,
};
