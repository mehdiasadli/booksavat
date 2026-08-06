import { defineRelations } from "drizzle-orm";

import { account, session, user, verification } from "@/db/schemas/auth.schema";
import { club, clubMembership } from "@/db/schemas/club.schema";
import { feedback } from "@/db/schemas/feedback.schema";
import { follow } from "@/db/schemas/follow.schema";
import { readingLog } from "@/db/schemas/reading-log.schema";
import { shelf, shelfItem } from "@/db/schemas/shelf.schema";

export const appRelations = defineRelations(
	{
		user,
		session,
		account,
		verification,
		shelf,
		shelfItem,
		readingLog,
		feedback,
		follow,
		club,
		clubMembership,
	},
	(r) => ({
		user: {
			sessions: r.many.session(),
			accounts: r.many.account(),
			shelves: r.many.shelf(),
			readingLogs: r.many.readingLog(),
			feedbacks: r.many.feedback(),
			following: r.many.follow({
				from: r.user.id,
				to: r.follow.followerId,
			}),
			followers: r.many.follow({
				from: r.user.id,
				to: r.follow.followingId,
			}),
			clubMemberships: r.many.clubMembership(),
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
		follow: {
			follower: r.one.user({
				from: r.follow.followerId,
				to: r.user.id,
				optional: false,
			}),
			following: r.one.user({
				from: r.follow.followingId,
				to: r.user.id,
				optional: false,
			}),
		},
		club: {
			memberships: r.many.clubMembership(),
		},
		clubMembership: {
			club: r.one.club({
				from: r.clubMembership.clubId,
				to: r.club.id,
				optional: false,
			}),
			user: r.one.user({
				from: r.clubMembership.userId,
				to: r.user.id,
				optional: false,
			}),
		},
	}),
);
