import * as z from "zod";

import { base, paginated, paginationInputSchema } from "@/server/contracts/base.contract";

export const clubVisibilitySchema = z.enum(["public", "invite_only", "private"]);
export const clubMemberRoleSchema = z.enum(["admin", "moderator", "member"]);
export const clubMemberStatusSchema = z.enum(["active", "invited", "requested"]);
export const clubBooklistItemStatusSchema = z.enum(["active", "proposed"]);
export const clubShortlistModeSchema = z.enum(["manual", "random"]);

export const clubBooklistSettingsSchema = z.object({
	modsCanAdd: z.boolean(),
	membersCanAdd: z.boolean(),
	modsCanRemove: z.boolean(),
	membersCanRemove: z.boolean(),
	modsCanPropose: z.boolean(),
	membersCanPropose: z.boolean(),
	shortlistMode: clubShortlistModeSchema,
	defaultShortlistSize: z.number().int().min(2).max(30),
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
};
