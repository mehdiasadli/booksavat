import * as z from "zod";

import { base, paginated, paginationInputSchema } from "@/server/contracts/base.contract";
import { readingLogStatusSchema } from "@/server/contracts/reading-log.contract";

export const clubVisibilitySchema = z.enum(["public", "invite_only", "private"]);
export const clubMemberRoleSchema = z.enum(["admin", "moderator", "member"]);
export const clubMemberStatusSchema = z.enum(["active", "invited", "requested"]);
export const clubBooklistItemStatusSchema = z.enum(["active", "proposed"]);
export const clubShortlistModeSchema = z.enum(["manual", "random"]);

const voteChipListSchema = z.array(z.number().int().min(1).max(99)).min(1).max(8);

export const voteChipsByRoleSchema = z.object({
	admin: voteChipListSchema,
	moderator: voteChipListSchema,
	member: voteChipListSchema,
});

export const clubBooklistSettingsSchema = z.object({
	modsCanAdd: z.boolean(),
	membersCanAdd: z.boolean(),
	modsCanRemove: z.boolean(),
	membersCanRemove: z.boolean(),
	modsCanPropose: z.boolean(),
	membersCanPropose: z.boolean(),
	shortlistMode: clubShortlistModeSchema,
	defaultShortlistSize: z.number().int().min(2).max(30),
	voteChipsByRole: voteChipsByRoleSchema,
});

export const clubSummarySchema = z.object({
	id: z.uuid(),
	name: z.string(),
	slug: z.string(),
	description: z.string().nullable(),
	visibility: clubVisibilitySchema,
	memberCount: z.number().int().min(0),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export const clubMembershipSchema = z.object({
	role: clubMemberRoleSchema,
	status: clubMemberStatusSchema,
});

export const clubDetailSchema = clubSummarySchema.extend({
	canViewContent: z.boolean(),
	membership: clubMembershipSchema.nullable(),
	inviteCode: z.string().nullable(),
	canManageSettings: z.boolean(),
	canInvite: z.boolean(),
	canModerateRequests: z.boolean(),
	booklistSettings: clubBooklistSettingsSchema,
	canAddToBooklist: z.boolean(),
	canProposeToBooklist: z.boolean(),
	canRemoveFromBooklist: z.boolean(),
	canModerateBooklistProposals: z.boolean(),
	canCreateSession: z.boolean(),
	canManageSessions: z.boolean(),
});

export const readingSessionStatusSchema = z.enum([
	"proposed",
	"voting",
	"pending",
	"reading",
	"reviewing",
	"completed",
	"cancelled",
	"abandoned",
]);

export const readingSessionSummarySchema = z.object({
	id: z.uuid(),
	clubId: z.uuid(),
	status: readingSessionStatusSchema,
	title: z.string().nullable(),
	joinDeadline: z.date(),
	readingDeadline: z.date().nullable(),
	selectedWorkId: z.string().nullable(),
	participantCount: z.number().int().min(0),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export const sessionVoteAssignmentSchema = z.object({
	points: z.number().int().min(1).max(99),
	workId: z.string(),
});

export const sessionVotingStateSchema = z.object({
	voteChipsByRole: voteChipsByRoleSchema.nullable(),
	shortlist: z.array(
		z.object({
			workId: z.string(),
			title: z.string(),
			coverUrl: z.string().nullable(),
			score: z.number().int().min(0),
		}),
	),
	leadingWorkIds: z.array(z.string()),
	viewerChips: z.array(z.number().int().min(1).max(99)),
	viewerAssignments: z.array(sessionVoteAssignmentSchema),
	canVote: z.boolean(),
	canManageShortlist: z.boolean(),
	canManageBlocklist: z.boolean(),
	participants: z.array(
		z.object({
			userId: z.uuid(),
			username: z.string(),
			name: z.string(),
			image: z.url().nullable(),
			voteBlocked: z.boolean(),
			hasVoted: z.boolean(),
		}),
	),
});

export const sessionParticipantReadingStatusSchema = z.enum([
	"not_started",
	"reading",
	"completed",
	"dnf",
]);

export const sessionReadingStateSchema = z.object({
	selectedWork: z
		.object({
			workId: z.string(),
			title: z.string(),
			coverUrl: z.string().nullable(),
		})
		.nullable(),
	readingDeadline: z.date().nullable(),
	deadlinePassed: z.boolean(),
	participants: z.array(
		z.object({
			userId: z.uuid(),
			username: z.string(),
			name: z.string(),
			image: z.url().nullable(),
			derivedStatus: sessionParticipantReadingStatusSchema,
			overrideStatus: readingLogStatusSchema.nullable(),
			effectiveStatus: sessionParticipantReadingStatusSchema,
			canOverride: z.boolean(),
		}),
	),
	summary: z.object({
		not_started: z.number().int().min(0),
		reading: z.number().int().min(0),
		completed: z.number().int().min(0),
		dnf: z.number().int().min(0),
	}),
});

export const readingSessionDetailSchema = readingSessionSummarySchema.extend({
	viewerJoined: z.boolean(),
	canJoin: z.boolean(),
	canLeave: z.boolean(),
	canAdvance: z.boolean(),
	canCancel: z.boolean(),
	canAbandon: z.boolean(),
	createdBy: z.object({
		id: z.uuid(),
		username: z.string(),
		name: z.string(),
		image: z.url().nullable(),
	}),
	voting: sessionVotingStateSchema,
	reading: sessionReadingStateSchema.nullable(),
});

export const clubBooklistItemSchema = z.object({
	id: z.uuid(),
	workId: z.string(),
	status: clubBooklistItemStatusSchema,
	title: z.string(),
	coverUrl: z.string().nullable(),
	createdAt: z.date(),
	updatedAt: z.date(),
	addedBy: z.object({
		id: z.uuid(),
		username: z.string(),
		name: z.string(),
		image: z.url().nullable(),
	}),
	viewerReadingStatus: z.enum(["reading", "completed", "dnf"]).nullable(),
	viewerHasFeedback: z.boolean(),
});

export const clubMemberCardSchema = z.object({
	id: z.uuid(),
	userId: z.uuid(),
	role: clubMemberRoleSchema,
	status: clubMemberStatusSchema,
	createdAt: z.date(),
	user: z.object({
		id: z.uuid(),
		username: z.string(),
		name: z.string(),
		image: z.url().nullable(),
	}),
});

export type ClubDetail = z.infer<typeof clubDetailSchema>;
export type ClubSummary = z.infer<typeof clubSummarySchema>;

const slugInput = z.object({ slug: z.string().trim().min(1).max(64) });
const usernameInput = z.object({
	slug: z.string().trim().min(1).max(64),
	username: z.string().trim().min(1).max(64),
});

export const createClubContract = base
	.route({
		method: "POST",
		path: "/club",
		tags: ["club"],
		summary: "Create a club",
	})
	.input(
		z.object({
			name: z.string().trim().min(1).max(80),
			slug: z.string().trim().min(1).max(48).optional(),
			description: z.string().trim().max(2000).nullable().optional(),
			visibility: clubVisibilitySchema.default("public"),
		}),
	)
	.output(clubDetailSchema);

export const updateClubContract = base
	.route({
		method: "PATCH",
		path: "/club/{slug}",
		tags: ["club"],
		summary: "Update club settings",
	})
	.input(
		z.object({
			slug: z.string().trim().min(1).max(64),
			name: z.string().trim().min(1).max(80).optional(),
			nextSlug: z.string().trim().min(1).max(48).optional(),
			description: z.string().trim().max(2000).nullable().optional(),
			visibility: clubVisibilitySchema.optional(),
		}),
	)
	.output(clubDetailSchema);

export const deleteClubContract = base
	.route({
		method: "DELETE",
		path: "/club/{slug}",
		tags: ["club"],
		summary: "Delete a club",
	})
	.input(slugInput)
	.output(z.object({ ok: z.literal(true) }));

export const getBySlugContract = base
	.route({
		method: "GET",
		path: "/club/{slug}",
		tags: ["club"],
		summary: "Get a club by slug",
	})
	.input(slugInput)
	.output(clubDetailSchema);

export const listMineContract = base
	.route({
		method: "GET",
		path: "/club/mine",
		tags: ["club"],
		summary: "List clubs I belong to",
	})
	.input(paginationInputSchema)
	.output(paginated(clubSummarySchema));

export const listPublicContract = base
	.route({
		method: "GET",
		path: "/club/public",
		tags: ["club"],
		summary: "List public clubs for explore",
	})
	.input(paginationInputSchema)
	.output(paginated(clubSummarySchema));

export const searchClubsContract = base
	.route({
		method: "GET",
		path: "/club/search",
		tags: ["club"],
		summary: "Search discoverable clubs",
	})
	.input(
		paginationInputSchema.extend({
			q: z.string().trim().min(1).max(100),
		}),
	)
	.output(paginated(clubSummarySchema));

export const listInvitesContract = base
	.route({
		method: "GET",
		path: "/club/invites",
		tags: ["club"],
		summary: "Pending club invites for me",
	})
	.output(
		z.object({
			items: z.array(
				z.object({
					membershipId: z.uuid(),
					club: clubSummarySchema,
					createdAt: z.date(),
				}),
			),
		}),
	);

export const joinClubContract = base
	.route({
		method: "POST",
		path: "/club/{slug}/join",
		tags: ["club"],
		summary: "Join a public club",
	})
	.input(slugInput)
	.output(clubDetailSchema);

export const requestJoinContract = base
	.route({
		method: "POST",
		path: "/club/{slug}/request",
		tags: ["club"],
		summary: "Request to join a private club",
	})
	.input(slugInput)
	.output(clubDetailSchema);

export const cancelRequestContract = base
	.route({
		method: "DELETE",
		path: "/club/{slug}/request",
		tags: ["club"],
		summary: "Cancel my join request",
	})
	.input(slugInput)
	.output(clubDetailSchema);

export const inviteUserContract = base
	.route({
		method: "POST",
		path: "/club/{slug}/invite",
		tags: ["club"],
		summary: "Invite a user by username",
	})
	.input(usernameInput)
	.output(z.object({ ok: z.literal(true) }));

export const acceptInviteContract = base
	.route({
		method: "POST",
		path: "/club/{slug}/invite/accept",
		tags: ["club"],
		summary: "Accept a club invite",
	})
	.input(slugInput)
	.output(clubDetailSchema);

export const declineInviteContract = base
	.route({
		method: "POST",
		path: "/club/{slug}/invite/decline",
		tags: ["club"],
		summary: "Decline a club invite",
	})
	.input(slugInput)
	.output(z.object({ ok: z.literal(true) }));

export const joinByCodeContract = base
	.route({
		method: "POST",
		path: "/club/join-by-code/{inviteCode}",
		tags: ["club"],
		summary: "Join via shareable invite code",
	})
	.input(z.object({ inviteCode: z.string().trim().min(8).max(64) }))
	.output(clubDetailSchema);

export const getByInviteCodeContract = base
	.route({
		method: "GET",
		path: "/club/join-by-code/{inviteCode}",
		tags: ["club"],
		summary: "Preview club for an invite code",
	})
	.input(z.object({ inviteCode: z.string().trim().min(8).max(64) }))
	.output(clubDetailSchema);

export const rotateInviteCodeContract = base
	.route({
		method: "POST",
		path: "/club/{slug}/invite-code/rotate",
		tags: ["club"],
		summary: "Rotate the shareable invite code",
	})
	.input(slugInput)
	.output(z.object({ inviteCode: z.string() }));

export const listMembersContract = base
	.route({
		method: "GET",
		path: "/club/{slug}/members",
		tags: ["club"],
		summary: "List active club members",
	})
	.input(paginationInputSchema.merge(slugInput))
	.output(paginated(clubMemberCardSchema));

export const listJoinRequestsContract = base
	.route({
		method: "GET",
		path: "/club/{slug}/requests",
		tags: ["club"],
		summary: "List pending join requests",
	})
	.input(slugInput)
	.output(z.object({ items: z.array(clubMemberCardSchema) }));

export const acceptJoinRequestContract = base
	.route({
		method: "POST",
		path: "/club/{slug}/requests/{username}/accept",
		tags: ["club"],
		summary: "Accept a join request",
	})
	.input(usernameInput)
	.output(z.object({ ok: z.literal(true) }));

export const rejectJoinRequestContract = base
	.route({
		method: "POST",
		path: "/club/{slug}/requests/{username}/reject",
		tags: ["club"],
		summary: "Reject a join request",
	})
	.input(usernameInput)
	.output(z.object({ ok: z.literal(true) }));

export const setRoleContract = base
	.route({
		method: "PUT",
		path: "/club/{slug}/members/{username}/role",
		tags: ["club"],
		summary: "Promote or demote a member",
	})
	.input(
		usernameInput.extend({
			role: z.enum(["moderator", "member"]),
		}),
	)
	.output(z.object({ ok: z.literal(true) }));

export const removeMemberContract = base
	.route({
		method: "DELETE",
		path: "/club/{slug}/members/{username}",
		tags: ["club"],
		summary: "Remove a member",
	})
	.input(usernameInput)
	.output(z.object({ ok: z.literal(true) }));

export const leaveClubContract = base
	.route({
		method: "POST",
		path: "/club/{slug}/leave",
		tags: ["club"],
		summary: "Leave a club",
	})
	.input(slugInput)
	.output(z.object({ deleted: z.boolean() }));

export const transferAdminContract = base
	.route({
		method: "POST",
		path: "/club/{slug}/transfer-admin",
		tags: ["club"],
		summary: "Transfer admin to another member",
	})
	.input(usernameInput)
	.output(z.object({ ok: z.literal(true) }));

const workIdInput = z.object({
	slug: z.string().trim().min(1).max(64),
	workId: z.string().trim().min(1).max(64),
});

export const updateBooklistSettingsContract = base
	.route({
		method: "PATCH",
		path: "/club/{slug}/booklist/settings",
		tags: ["club"],
		summary: "Update club booklist settings",
	})
	.input(
		z.object({
			slug: z.string().trim().min(1).max(64),
			modsCanAdd: z.boolean().optional(),
			membersCanAdd: z.boolean().optional(),
			modsCanRemove: z.boolean().optional(),
			membersCanRemove: z.boolean().optional(),
			modsCanPropose: z.boolean().optional(),
			membersCanPropose: z.boolean().optional(),
			shortlistMode: clubShortlistModeSchema.optional(),
			defaultShortlistSize: z.number().int().min(2).max(30).optional(),
			voteChipsByRole: voteChipsByRoleSchema.optional(),
		}),
	)
	.output(clubBooklistSettingsSchema);

export const listBooklistContract = base
	.route({
		method: "GET",
		path: "/club/{slug}/booklist",
		tags: ["club"],
		summary: "List active club booklist items",
	})
	.input(paginationInputSchema.merge(slugInput))
	.output(paginated(clubBooklistItemSchema));

export const listBooklistProposalsContract = base
	.route({
		method: "GET",
		path: "/club/{slug}/booklist/proposals",
		tags: ["club"],
		summary: "List pending booklist proposals",
	})
	.input(slugInput)
	.output(z.object({ items: z.array(clubBooklistItemSchema) }));

export const addBooklistItemContract = base
	.route({
		method: "POST",
		path: "/club/{slug}/booklist",
		tags: ["club"],
		summary: "Add or propose a book to the club booklist",
	})
	.input(workIdInput)
	.output(clubBooklistItemSchema);

export const approveBooklistProposalContract = base
	.route({
		method: "POST",
		path: "/club/{slug}/booklist/proposals/{workId}/approve",
		tags: ["club"],
		summary: "Approve a booklist proposal",
	})
	.input(workIdInput)
	.output(clubBooklistItemSchema);

export const rejectBooklistProposalContract = base
	.route({
		method: "POST",
		path: "/club/{slug}/booklist/proposals/{workId}/reject",
		tags: ["club"],
		summary: "Reject a booklist proposal",
	})
	.input(workIdInput)
	.output(z.object({ ok: z.literal(true) }));

export const removeBooklistItemContract = base
	.route({
		method: "DELETE",
		path: "/club/{slug}/booklist/{workId}",
		tags: ["club"],
		summary: "Remove a book from the club booklist",
	})
	.input(workIdInput)
	.output(z.object({ ok: z.literal(true) }));

const sessionIdInput = z.object({
	slug: z.string().trim().min(1).max(64),
	sessionId: z.uuid(),
});

export const createReadingSessionContract = base
	.route({
		method: "POST",
		path: "/club/{slug}/sessions",
		tags: ["club"],
		summary: "Create a reading session",
	})
	.input(
		z.object({
			slug: z.string().trim().min(1).max(64),
			title: z.string().trim().max(120).nullable().optional(),
			joinDeadline: z.coerce.date(),
			readingDeadline: z.coerce.date().nullable().optional(),
		}),
	)
	.output(readingSessionDetailSchema);

export const listReadingSessionsContract = base
	.route({
		method: "GET",
		path: "/club/{slug}/sessions",
		tags: ["club"],
		summary: "List reading sessions for a club",
	})
	.input(paginationInputSchema.merge(slugInput))
	.output(paginated(readingSessionSummarySchema));

export const getReadingSessionContract = base
	.route({
		method: "GET",
		path: "/club/{slug}/sessions/{sessionId}",
		tags: ["club"],
		summary: "Get a reading session",
	})
	.input(sessionIdInput)
	.output(readingSessionDetailSchema);

export const joinReadingSessionContract = base
	.route({
		method: "POST",
		path: "/club/{slug}/sessions/{sessionId}/join",
		tags: ["club"],
		summary: "Join a reading session",
	})
	.input(sessionIdInput)
	.output(readingSessionDetailSchema);

export const leaveReadingSessionContract = base
	.route({
		method: "POST",
		path: "/club/{slug}/sessions/{sessionId}/leave",
		tags: ["club"],
		summary: "Leave a reading session",
	})
	.input(sessionIdInput)
	.output(readingSessionDetailSchema);

export const advanceReadingSessionContract = base
	.route({
		method: "POST",
		path: "/club/{slug}/sessions/{sessionId}/advance",
		tags: ["club"],
		summary: "Advance a reading session to the next stage",
	})
	.input(
		sessionIdInput.extend({
			selectedWorkId: z.string().trim().min(1).max(64).optional(),
		}),
	)
	.output(readingSessionDetailSchema);

export const cancelReadingSessionContract = base
	.route({
		method: "POST",
		path: "/club/{slug}/sessions/{sessionId}/cancel",
		tags: ["club"],
		summary: "Cancel a reading session",
	})
	.input(sessionIdInput)
	.output(readingSessionDetailSchema);

export const abandonReadingSessionContract = base
	.route({
		method: "POST",
		path: "/club/{slug}/sessions/{sessionId}/abandon",
		tags: ["club"],
		summary: "Abandon a reading session",
	})
	.input(sessionIdInput)
	.output(readingSessionDetailSchema);

export const addSessionShortlistItemContract = base
	.route({
		method: "POST",
		path: "/club/{slug}/sessions/{sessionId}/shortlist",
		tags: ["club"],
		summary: "Add a book to the session shortlist",
	})
	.input(
		sessionIdInput.extend({
			workId: z.string().trim().min(1).max(64),
		}),
	)
	.output(sessionVotingStateSchema);

export const removeSessionShortlistItemContract = base
	.route({
		method: "DELETE",
		path: "/club/{slug}/sessions/{sessionId}/shortlist/{workId}",
		tags: ["club"],
		summary: "Remove a book from the session shortlist",
	})
	.input(
		sessionIdInput.extend({
			workId: z.string().trim().min(1).max(64),
		}),
	)
	.output(sessionVotingStateSchema);

export const fillRandomSessionShortlistContract = base
	.route({
		method: "POST",
		path: "/club/{slug}/sessions/{sessionId}/shortlist/random",
		tags: ["club"],
		summary: "Fill the session shortlist randomly from the booklist",
	})
	.input(
		sessionIdInput.extend({
			size: z.number().int().min(2).max(30).optional(),
		}),
	)
	.output(sessionVotingStateSchema);

export const castSessionVotesContract = base
	.route({
		method: "POST",
		path: "/club/{slug}/sessions/{sessionId}/votes",
		tags: ["club"],
		summary: "Cast or update session vote chip assignments",
	})
	.input(
		sessionIdInput.extend({
			assignments: z.array(sessionVoteAssignmentSchema).min(1).max(8),
		}),
	)
	.output(sessionVotingStateSchema);

export const setSessionVoteBlockedContract = base
	.route({
		method: "POST",
		path: "/club/{slug}/sessions/{sessionId}/vote-block",
		tags: ["club"],
		summary: "Block or unblock a participant from voting",
	})
	.input(
		sessionIdInput.extend({
			userId: z.uuid(),
			voteBlocked: z.boolean(),
		}),
	)
	.output(sessionVotingStateSchema);

export const setSessionReadingOverrideContract = base
	.route({
		method: "POST",
		path: "/club/{slug}/sessions/{sessionId}/reading-override",
		tags: ["club"],
		summary: "Set or clear a participant reading status override",
	})
	.input(
		sessionIdInput.extend({
			userId: z.uuid().optional(),
			status: readingLogStatusSchema.nullable(),
		}),
	)
	.output(sessionReadingStateSchema);

const richTextDocumentSchema = z.record(z.string(), z.unknown());

export const sessionDiscussionReactionSchema = z.object({
	emoji: z.string(),
	count: z.number().int().min(0),
	reactedByViewer: z.boolean(),
});

export type SessionDiscussionMessageSchema = {
	id: string;
	sessionId: string;
	parentId: string | null;
	depth: number;
	body: Record<string, unknown>;
	createdAt: Date;
	updatedAt: Date;
	author: {
		id: string;
		username: string;
		name: string;
		image: string | null;
	};
	reactions: z.infer<typeof sessionDiscussionReactionSchema>[];
	canDelete: boolean;
	canReply: boolean;
	replies: SessionDiscussionMessageSchema[];
};

export const sessionDiscussionMessageSchema: z.ZodType<SessionDiscussionMessageSchema> = z.lazy(
	() =>
		z.object({
			id: z.uuid(),
			sessionId: z.uuid(),
			parentId: z.uuid().nullable(),
			depth: z.number().int().min(0).max(5),
			body: richTextDocumentSchema,
			createdAt: z.date(),
			updatedAt: z.date(),
			author: z.object({
				id: z.uuid(),
				username: z.string(),
				name: z.string(),
				image: z.url().nullable(),
			}),
			reactions: z.array(sessionDiscussionReactionSchema),
			canDelete: z.boolean(),
			canReply: z.boolean(),
			replies: z.array(sessionDiscussionMessageSchema),
		}),
);

export const sessionDiscussionStateSchema = z.object({
	canPost: z.boolean(),
	canReact: z.boolean(),
	readOnly: z.boolean(),
	maxDepth: z.number().int().min(0),
	reactionEmojis: z.array(z.string()),
	messages: z.array(sessionDiscussionMessageSchema),
	messageCount: z.number().int().min(0),
});

export const getSessionDiscussionContract = base
	.route({
		method: "GET",
		path: "/club/{slug}/sessions/{sessionId}/discussion",
		tags: ["club"],
		summary: "Get the session discussion thread",
	})
	.input(sessionIdInput)
	.output(sessionDiscussionStateSchema);

export const createSessionDiscussionMessageContract = base
	.route({
		method: "POST",
		path: "/club/{slug}/sessions/{sessionId}/discussion",
		tags: ["club"],
		summary: "Post a session discussion message or reply",
	})
	.input(
		sessionIdInput.extend({
			parentId: z.uuid().nullable().optional(),
			body: richTextDocumentSchema,
		}),
	)
	.output(sessionDiscussionStateSchema);

export const deleteSessionDiscussionMessageContract = base
	.route({
		method: "DELETE",
		path: "/club/{slug}/sessions/{sessionId}/discussion/{messageId}",
		tags: ["club"],
		summary: "Delete a session discussion message",
	})
	.input(
		sessionIdInput.extend({
			messageId: z.uuid(),
		}),
	)
	.output(sessionDiscussionStateSchema);

export const toggleSessionDiscussionReactionContract = base
	.route({
		method: "POST",
		path: "/club/{slug}/sessions/{sessionId}/discussion/{messageId}/reactions",
		tags: ["club"],
		summary: "Toggle a reaction on a discussion message",
	})
	.input(
		sessionIdInput.extend({
			messageId: z.uuid(),
			emoji: z.string().min(1).max(16),
		}),
	)
	.output(sessionDiscussionStateSchema);

export const clubContract = {
	create: createClubContract,
	update: updateClubContract,
	delete: deleteClubContract,
	getBySlug: getBySlugContract,
	listMine: listMineContract,
	listPublic: listPublicContract,
	search: searchClubsContract,
	listInvites: listInvitesContract,
	join: joinClubContract,
	requestJoin: requestJoinContract,
	cancelRequest: cancelRequestContract,
	invite: inviteUserContract,
	acceptInvite: acceptInviteContract,
	declineInvite: declineInviteContract,
	joinByCode: joinByCodeContract,
	getByInviteCode: getByInviteCodeContract,
	rotateInviteCode: rotateInviteCodeContract,
	listMembers: listMembersContract,
	listRequests: listJoinRequestsContract,
	acceptRequest: acceptJoinRequestContract,
	rejectRequest: rejectJoinRequestContract,
	setRole: setRoleContract,
	removeMember: removeMemberContract,
	leave: leaveClubContract,
	transferAdmin: transferAdminContract,
	updateBooklistSettings: updateBooklistSettingsContract,
	listBooklist: listBooklistContract,
	listBooklistProposals: listBooklistProposalsContract,
	addBooklistItem: addBooklistItemContract,
	approveBooklistProposal: approveBooklistProposalContract,
	rejectBooklistProposal: rejectBooklistProposalContract,
	removeBooklistItem: removeBooklistItemContract,
	createReadingSession: createReadingSessionContract,
	listReadingSessions: listReadingSessionsContract,
	getReadingSession: getReadingSessionContract,
	joinReadingSession: joinReadingSessionContract,
	leaveReadingSession: leaveReadingSessionContract,
	advanceReadingSession: advanceReadingSessionContract,
	cancelReadingSession: cancelReadingSessionContract,
	abandonReadingSession: abandonReadingSessionContract,
	addSessionShortlistItem: addSessionShortlistItemContract,
	removeSessionShortlistItem: removeSessionShortlistItemContract,
	fillRandomSessionShortlist: fillRandomSessionShortlistContract,
	castSessionVotes: castSessionVotesContract,
	setSessionVoteBlocked: setSessionVoteBlockedContract,
	setSessionReadingOverride: setSessionReadingOverrideContract,
	getSessionDiscussion: getSessionDiscussionContract,
	createSessionDiscussionMessage: createSessionDiscussionMessageContract,
	deleteSessionDiscussionMessage: deleteSessionDiscussionMessageContract,
	toggleSessionDiscussionReaction: toggleSessionDiscussionReactionContract,
};
