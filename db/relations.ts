import { defineRelations } from "drizzle-orm";

import { account, session, user, verification } from "@/db/schemas/auth.schema";
import { feedback } from "@/db/schemas/feedback.schema";
import { readingLog } from "@/db/schemas/reading-log.schema";
import { shelf, shelfItem } from "@/db/schemas/shelf.schema";

export const appRelations = defineRelations(
	{ user, session, account, verification, shelf, shelfItem, readingLog, feedback },
	(r) => ({
		user: {
			sessions: r.many.session(),
			accounts: r.many.account(),
			shelves: r.many.shelf(),
			readingLogs: r.many.readingLog(),
			feedbacks: r.many.feedback(),
		},
		session: {
			user: r.one.user({
				from: r.session.userId,
				to: r.user.id,
				optional: false,
			}),
		},
		account: {
			user: r.one.user({
				from: r.account.userId,
				to: r.user.id,
				optional: false,
			}),
		},
		shelf: {
			user: r.one.user({
				from: r.shelf.userId,
				to: r.user.id,
				optional: false,
			}),
			items: r.many.shelfItem(),
		},
		shelfItem: {
			shelf: r.one.shelf({
				from: r.shelfItem.shelfId,
				to: r.shelf.id,
				optional: false,
			}),
		},
		readingLog: {
			user: r.one.user({
				from: r.readingLog.userId,
				to: r.user.id,
				optional: false,
			}),
		},
		feedback: {
			user: r.one.user({
				from: r.feedback.userId,
				to: r.user.id,
				optional: false,
			}),
		},
	}),
);
