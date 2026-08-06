import { defineRelations } from "drizzle-orm";

import { account, session, user, verification } from "@/db/schemas/auth.schema";
import { club, clubBooklistItem, clubMembership } from "@/db/schemas/club.schema";
import {
	readingSession,
	sessionDiscussionMessage,
	sessionDiscussionReaction,
	sessionParticipant,
	sessionShortlistItem,
	sessionVoteAssignment,
} from "@/db/schemas/club-session.schema";
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
		clubBooklistItem,
		readingSession,
		sessionParticipant,
		sessionShortlistItem,
		sessionVoteAssignment,
		sessionDiscussionMessage,
		sessionDiscussionReaction,
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
			clubBooklistItems: r.many.clubBooklistItem(),
			createdReadingSessions: r.many.readingSession(),
			sessionParticipations: r.many.sessionParticipant(),
			sessionShortlistItems: r.many.sessionShortlistItem(),
			sessionVoteAssignments: r.many.sessionVoteAssignment(),
			sessionDiscussionMessages: r.many.sessionDiscussionMessage(),
			sessionDiscussionReactions: r.many.sessionDiscussionReaction(),
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
			booklistItems: r.many.clubBooklistItem(),
			readingSessions: r.many.readingSession(),
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
		clubBooklistItem: {
			club: r.one.club({
				from: r.clubBooklistItem.clubId,
				to: r.club.id,
				optional: false,
			}),
			addedBy: r.one.user({
				from: r.clubBooklistItem.addedByUserId,
				to: r.user.id,
				optional: false,
			}),
		},
		readingSession: {
			club: r.one.club({
				from: r.readingSession.clubId,
				to: r.club.id,
				optional: false,
			}),
			createdBy: r.one.user({
				from: r.readingSession.createdByUserId,
				to: r.user.id,
				optional: false,
			}),
			participants: r.many.sessionParticipant(),
			shortlistItems: r.many.sessionShortlistItem(),
			voteAssignments: r.many.sessionVoteAssignment(),
			discussionMessages: r.many.sessionDiscussionMessage(),
		},
		sessionParticipant: {
			session: r.one.readingSession({
				from: r.sessionParticipant.sessionId,
				to: r.readingSession.id,
				optional: false,
			}),
			user: r.one.user({
				from: r.sessionParticipant.userId,
				to: r.user.id,
				optional: false,
			}),
		},
		sessionShortlistItem: {
			session: r.one.readingSession({
				from: r.sessionShortlistItem.sessionId,
				to: r.readingSession.id,
				optional: false,
			}),
			addedBy: r.one.user({
				from: r.sessionShortlistItem.addedByUserId,
				to: r.user.id,
				optional: false,
			}),
		},
		sessionVoteAssignment: {
			session: r.one.readingSession({
				from: r.sessionVoteAssignment.sessionId,
				to: r.readingSession.id,
				optional: false,
			}),
			user: r.one.user({
				from: r.sessionVoteAssignment.userId,
				to: r.user.id,
				optional: false,
			}),
		},
		sessionDiscussionMessage: {
			session: r.one.readingSession({
				from: r.sessionDiscussionMessage.sessionId,
				to: r.readingSession.id,
				optional: false,
			}),
			author: r.one.user({
				from: r.sessionDiscussionMessage.authorUserId,
				to: r.user.id,
				optional: false,
			}),
			parent: r.one.sessionDiscussionMessage({
				from: r.sessionDiscussionMessage.parentId,
				to: r.sessionDiscussionMessage.id,
			}),
			replies: r.many.sessionDiscussionMessage({
				from: r.sessionDiscussionMessage.id,
				to: r.sessionDiscussionMessage.parentId,
			}),
			reactions: r.many.sessionDiscussionReaction(),
		},
		sessionDiscussionReaction: {
			message: r.one.sessionDiscussionMessage({
				from: r.sessionDiscussionReaction.messageId,
				to: r.sessionDiscussionMessage.id,
				optional: false,
			}),
			user: r.one.user({
				from: r.sessionDiscussionReaction.userId,
				to: r.user.id,
				optional: false,
			}),
		},
	}),
);
