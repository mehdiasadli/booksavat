import {
	addOrProposeBooklistItem,
	approveBooklistProposal,
	listBooklist,
	listBooklistProposals,
	rejectBooklistProposal,
	removeBooklistItem,
	updateBooklistSettings,
} from "@/lib/clubs/booklist.server";
import {
	createCommunityComment,
	createCommunityPost,
	deleteCommunityComment,
	deleteCommunityPost,
	getCommunityPost,
	listCommunityFeed,
	pinCommunityPost,
	toggleCommunityCommentReaction,
	toggleCommunityPostReaction,
	updateCommunityPost,
	updateCommunitySettings,
} from "@/lib/clubs/community.server";
import {
	acceptInvite,
	acceptRequest,
	cancelRequest,
	createClub,
	declineInvite,
	deleteClub,
	getClubByInviteCode,
	getClubBySlug,
	inviteByUsername,
	joinByInviteCode,
	joinPublicClub,
	leaveClub,
	listMembers,
	listMyClubs,
	listPendingInvitesForUser,
	listPublicClubs,
	listRequests,
	rejectRequest,
	removeMember,
	requestJoin,
	rotateInviteCode,
	searchClubs,
	setMemberRole,
	transferAdmin,
	updateClub,
} from "@/lib/clubs/service.server";
import {
	abandonReadingSession,
	advanceReadingSession,
	cancelReadingSession,
	createReadingSession,
	getReadingSession,
	joinReadingSession,
	leaveReadingSession,
	listReadingSessions,
} from "@/lib/clubs/session.server";
import {
	createSessionDiscussionMessage,
	deleteSessionDiscussionMessage,
	getSessionDiscussion,
	toggleSessionDiscussionReaction,
} from "@/lib/clubs/session-discussion.server";
import { setSessionReadingOverride } from "@/lib/clubs/session-reading.server";
import {
	addSessionShortlistItem,
	castSessionVotes,
	fillRandomSessionShortlist,
	removeSessionShortlistItem,
	setSessionVoteBlocked,
} from "@/lib/clubs/session-voting.server";
import { protectedProcedure, publicProcedure } from "@/server/procedures";

function mapServiceError(
	errors: {
		NOT_FOUND: (args: { message: string }) => Error;
		FORBIDDEN: (args: { message: string }) => Error;
		CONFLICT: (args: { message: string }) => Error;
		BAD_REQUEST: (args: { message: string }) => Error;
	},
	result: { ok: false; code: string; message: string },
) {
	if (result.code === "not_found") {
		return errors.NOT_FOUND({ message: result.message });
	}
	if (result.code === "forbidden") {
		return errors.FORBIDDEN({ message: result.message });
	}
	if (result.code === "conflict") {
		return errors.CONFLICT({ message: result.message });
	}
	return errors.BAD_REQUEST({ message: result.message });
}

export const create = protectedProcedure.club.create.handler(async ({ input, context, errors }) => {
	const result = await createClub(context.db, context.viewer.user.id, input);
	if (!result.ok) throw mapServiceError(errors, result);
	return result.data;
});

export const update = protectedProcedure.club.update.handler(async ({ input, context, errors }) => {
	const { slug, ...patch } = input;
	const result = await updateClub(context.db, context.viewer.user.id, slug, patch);
	if (!result.ok) throw mapServiceError(errors, result);
	return result.data;
});

export const deleteClubRoute = protectedProcedure.club.delete.handler(
	async ({ input, context, errors }) => {
		const result = await deleteClub(context.db, context.viewer.user.id, input.slug);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const getBySlug = publicProcedure.club.getBySlug.handler(
	async ({ input, context, errors }) => {
		const result = await getClubBySlug(context.db, input.slug, context.session?.user?.id);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const listMine = protectedProcedure.club.listMine.handler(async ({ input, context }) => {
	return listMyClubs(context.db, context.viewer.user.id, {
		limit: input.limit,
		offset: input.offset,
	});
});

export const listPublic = publicProcedure.club.listPublic.handler(async ({ input, context }) => {
	return listPublicClubs(context.db, { limit: input.limit, offset: input.offset });
});

export const search = publicProcedure.club.search.handler(async ({ input, context }) => {
	return searchClubs(context.db, input.q, context.session?.user?.id, {
		limit: input.limit,
		offset: input.offset,
	});
});

export const listInvites = protectedProcedure.club.listInvites.handler(async ({ context }) => {
	const items = await listPendingInvitesForUser(context.db, context.viewer.user.id);
	return { items };
});

export const join = protectedProcedure.club.join.handler(async ({ input, context, errors }) => {
	const result = await joinPublicClub(context.db, context.viewer.user.id, input.slug);
	if (!result.ok) throw mapServiceError(errors, result);
	return result.data;
});

export const requestJoinRoute = protectedProcedure.club.requestJoin.handler(
	async ({ input, context, errors }) => {
		const result = await requestJoin(context.db, context.viewer.user.id, input.slug);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const cancelRequestRoute = protectedProcedure.club.cancelRequest.handler(
	async ({ input, context, errors }) => {
		const result = await cancelRequest(context.db, context.viewer.user.id, input.slug);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const invite = protectedProcedure.club.invite.handler(async ({ input, context, errors }) => {
	const result = await inviteByUsername(
		context.db,
		context.viewer.user.id,
		input.slug,
		input.username,
	);
	if (!result.ok) throw mapServiceError(errors, result);
	return result.data;
});

export const acceptInviteRoute = protectedProcedure.club.acceptInvite.handler(
	async ({ input, context, errors }) => {
		const result = await acceptInvite(context.db, context.viewer.user.id, input.slug);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const declineInviteRoute = protectedProcedure.club.declineInvite.handler(
	async ({ input, context, errors }) => {
		const result = await declineInvite(context.db, context.viewer.user.id, input.slug);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const joinByCode = protectedProcedure.club.joinByCode.handler(
	async ({ input, context, errors }) => {
		const result = await joinByInviteCode(context.db, context.viewer.user.id, input.inviteCode);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const getByInviteCode = publicProcedure.club.getByInviteCode.handler(
	async ({ input, context, errors }) => {
		const result = await getClubByInviteCode(
			context.db,
			input.inviteCode,
			context.session?.user?.id,
		);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const rotateInviteCodeRoute = protectedProcedure.club.rotateInviteCode.handler(
	async ({ input, context, errors }) => {
		const result = await rotateInviteCode(context.db, context.viewer.user.id, input.slug);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const listMembersRoute = publicProcedure.club.listMembers.handler(
	async ({ input, context, errors }) => {
		const result = await listMembers(context.db, input.slug, context.session?.user?.id, {
			limit: input.limit,
			offset: input.offset,
		});
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const listRequestsRoute = protectedProcedure.club.listRequests.handler(
	async ({ input, context, errors }) => {
		const result = await listRequests(context.db, context.viewer.user.id, input.slug);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const acceptRequestRoute = protectedProcedure.club.acceptRequest.handler(
	async ({ input, context, errors }) => {
		const result = await acceptRequest(
			context.db,
			context.viewer.user.id,
			input.slug,
			input.username,
		);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const rejectRequestRoute = protectedProcedure.club.rejectRequest.handler(
	async ({ input, context, errors }) => {
		const result = await rejectRequest(
			context.db,
			context.viewer.user.id,
			input.slug,
			input.username,
		);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const setRole = protectedProcedure.club.setRole.handler(
	async ({ input, context, errors }) => {
		const result = await setMemberRole(
			context.db,
			context.viewer.user.id,
			input.slug,
			input.username,
			input.role,
		);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const removeMemberRoute = protectedProcedure.club.removeMember.handler(
	async ({ input, context, errors }) => {
		const result = await removeMember(
			context.db,
			context.viewer.user.id,
			input.slug,
			input.username,
		);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const leave = protectedProcedure.club.leave.handler(async ({ input, context, errors }) => {
	const result = await leaveClub(context.db, context.viewer.user.id, input.slug);
	if (!result.ok) throw mapServiceError(errors, result);
	return result.data;
});

export const transferAdminRoute = protectedProcedure.club.transferAdmin.handler(
	async ({ input, context, errors }) => {
		const result = await transferAdmin(
			context.db,
			context.viewer.user.id,
			input.slug,
			input.username,
		);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const updateBooklistSettingsRoute = protectedProcedure.club.updateBooklistSettings.handler(
	async ({ input, context, errors }) => {
		const { slug, ...patch } = input;
		const result = await updateBooklistSettings(context.db, context.viewer.user.id, slug, patch);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const listBooklistRoute = publicProcedure.club.listBooklist.handler(
	async ({ input, context, errors }) => {
		const result = await listBooklist(context.db, input.slug, context.session?.user?.id, {
			limit: input.limit,
			offset: input.offset,
		});
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const listBooklistProposalsRoute = protectedProcedure.club.listBooklistProposals.handler(
	async ({ input, context, errors }) => {
		const result = await listBooklistProposals(context.db, input.slug, context.viewer.user.id);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const addBooklistItemRoute = protectedProcedure.club.addBooklistItem.handler(
	async ({ input, context, errors }) => {
		const result = await addOrProposeBooklistItem(
			context.db,
			context.viewer.user.id,
			input.slug,
			input.workId,
		);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const approveBooklistProposalRoute = protectedProcedure.club.approveBooklistProposal.handler(
	async ({ input, context, errors }) => {
		const result = await approveBooklistProposal(
			context.db,
			context.viewer.user.id,
			input.slug,
			input.workId,
		);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const rejectBooklistProposalRoute = protectedProcedure.club.rejectBooklistProposal.handler(
	async ({ input, context, errors }) => {
		const result = await rejectBooklistProposal(
			context.db,
			context.viewer.user.id,
			input.slug,
			input.workId,
		);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const removeBooklistItemRoute = protectedProcedure.club.removeBooklistItem.handler(
	async ({ input, context, errors }) => {
		const result = await removeBooklistItem(
			context.db,
			context.viewer.user.id,
			input.slug,
			input.workId,
		);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const createReadingSessionRoute = protectedProcedure.club.createReadingSession.handler(
	async ({ input, context, errors }) => {
		const { slug, ...body } = input;
		const result = await createReadingSession(context.db, context.viewer.user.id, slug, body);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const listReadingSessionsRoute = publicProcedure.club.listReadingSessions.handler(
	async ({ input, context, errors }) => {
		const result = await listReadingSessions(context.db, input.slug, context.session?.user?.id, {
			limit: input.limit,
			offset: input.offset,
		});
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const getReadingSessionRoute = publicProcedure.club.getReadingSession.handler(
	async ({ input, context, errors }) => {
		const result = await getReadingSession(
			context.db,
			input.slug,
			input.sessionId,
			context.session?.user?.id,
		);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const joinReadingSessionRoute = protectedProcedure.club.joinReadingSession.handler(
	async ({ input, context, errors }) => {
		const result = await joinReadingSession(
			context.db,
			context.viewer.user.id,
			input.slug,
			input.sessionId,
		);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const leaveReadingSessionRoute = protectedProcedure.club.leaveReadingSession.handler(
	async ({ input, context, errors }) => {
		const result = await leaveReadingSession(
			context.db,
			context.viewer.user.id,
			input.slug,
			input.sessionId,
		);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const advanceReadingSessionRoute = protectedProcedure.club.advanceReadingSession.handler(
	async ({ input, context, errors }) => {
		const result = await advanceReadingSession(
			context.db,
			context.viewer.user.id,
			input.slug,
			input.sessionId,
			{ selectedWorkId: input.selectedWorkId },
		);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const cancelReadingSessionRoute = protectedProcedure.club.cancelReadingSession.handler(
	async ({ input, context, errors }) => {
		const result = await cancelReadingSession(
			context.db,
			context.viewer.user.id,
			input.slug,
			input.sessionId,
		);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const abandonReadingSessionRoute = protectedProcedure.club.abandonReadingSession.handler(
	async ({ input, context, errors }) => {
		const result = await abandonReadingSession(
			context.db,
			context.viewer.user.id,
			input.slug,
			input.sessionId,
		);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const addSessionShortlistItemRoute = protectedProcedure.club.addSessionShortlistItem.handler(
	async ({ input, context, errors }) => {
		const result = await addSessionShortlistItem(
			context.db,
			context.viewer.user.id,
			input.slug,
			input.sessionId,
			input.workId,
		);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const removeSessionShortlistItemRoute =
	protectedProcedure.club.removeSessionShortlistItem.handler(async ({ input, context, errors }) => {
		const result = await removeSessionShortlistItem(
			context.db,
			context.viewer.user.id,
			input.slug,
			input.sessionId,
			input.workId,
		);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	});

export const fillRandomSessionShortlistRoute =
	protectedProcedure.club.fillRandomSessionShortlist.handler(async ({ input, context, errors }) => {
		const result = await fillRandomSessionShortlist(
			context.db,
			context.viewer.user.id,
			input.slug,
			input.sessionId,
			input.size,
		);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	});

export const castSessionVotesRoute = protectedProcedure.club.castSessionVotes.handler(
	async ({ input, context, errors }) => {
		const result = await castSessionVotes(
			context.db,
			context.viewer.user.id,
			input.slug,
			input.sessionId,
			input.assignments,
		);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const setSessionVoteBlockedRoute = protectedProcedure.club.setSessionVoteBlocked.handler(
	async ({ input, context, errors }) => {
		const result = await setSessionVoteBlocked(
			context.db,
			context.viewer.user.id,
			input.slug,
			input.sessionId,
			input.userId,
			input.voteBlocked,
		);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const setSessionReadingOverrideRoute =
	protectedProcedure.club.setSessionReadingOverride.handler(async ({ input, context, errors }) => {
		const result = await setSessionReadingOverride(
			context.db,
			context.viewer.user.id,
			input.slug,
			input.sessionId,
			{ userId: input.userId, status: input.status },
		);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	});

export const getSessionDiscussionRoute = publicProcedure.club.getSessionDiscussion.handler(
	async ({ input, context, errors }) => {
		const result = await getSessionDiscussion(
			context.db,
			input.slug,
			input.sessionId,
			context.session?.user?.id,
		);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const createSessionDiscussionMessageRoute =
	protectedProcedure.club.createSessionDiscussionMessage.handler(
		async ({ input, context, errors }) => {
			const result = await createSessionDiscussionMessage(
				context.db,
				context.viewer.user.id,
				input.slug,
				input.sessionId,
				{ parentId: input.parentId, body: input.body },
			);
			if (!result.ok) throw mapServiceError(errors, result);
			return result.data;
		},
	);

export const deleteSessionDiscussionMessageRoute =
	protectedProcedure.club.deleteSessionDiscussionMessage.handler(
		async ({ input, context, errors }) => {
			const result = await deleteSessionDiscussionMessage(
				context.db,
				context.viewer.user.id,
				input.slug,
				input.sessionId,
				input.messageId,
			);
			if (!result.ok) throw mapServiceError(errors, result);
			return result.data;
		},
	);

export const toggleSessionDiscussionReactionRoute =
	protectedProcedure.club.toggleSessionDiscussionReaction.handler(
		async ({ input, context, errors }) => {
			const result = await toggleSessionDiscussionReaction(
				context.db,
				context.viewer.user.id,
				input.slug,
				input.sessionId,
				input.messageId,
				input.emoji,
			);
			if (!result.ok) throw mapServiceError(errors, result);
			return result.data;
		},
	);

export const updateCommunitySettingsRoute = protectedProcedure.club.updateCommunitySettings.handler(
	async ({ input, context, errors }) => {
		const result = await updateCommunitySettings(context.db, context.viewer.user.id, input.slug, {
			communityEnabled: input.communityEnabled,
			canPost: input.canPost,
			defaultCanPeopleComment: input.defaultCanPeopleComment,
			defaultCanPeopleReact: input.defaultCanPeopleReact,
		});
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const listCommunityFeedRoute = publicProcedure.club.listCommunityFeed.handler(
	async ({ input, context, errors }) => {
		const result = await listCommunityFeed(context.db, input.slug, context.session?.user?.id, {
			sort: input.sort,
			topRange: input.topRange,
			type: input.type,
			authorRole: input.authorRole,
			pinnedOnly: input.pinnedOnly,
			cursor: input.cursor,
			limit: input.limit,
		});
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const getCommunityPostRoute = publicProcedure.club.getCommunityPost.handler(
	async ({ input, context, errors }) => {
		const result = await getCommunityPost(
			context.db,
			input.slug,
			input.postSlug,
			context.session?.user?.id,
		);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const createCommunityPostRoute = protectedProcedure.club.createCommunityPost.handler(
	async ({ input, context, errors }) => {
		const result = await createCommunityPost(context.db, context.viewer.user.id, input.slug, {
			title: input.title,
			body: input.body,
			type: input.type,
			canPeopleComment: input.canPeopleComment,
			canPeopleReact: input.canPeopleReact,
			attachments: input.attachments,
		});
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const updateCommunityPostRoute = protectedProcedure.club.updateCommunityPost.handler(
	async ({ input, context, errors }) => {
		const result = await updateCommunityPost(
			context.db,
			context.viewer.user.id,
			input.slug,
			input.postSlug,
			{
				title: input.title,
				body: input.body,
				canPeopleComment: input.canPeopleComment,
				canPeopleReact: input.canPeopleReact,
				attachments: input.attachments,
			},
		);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const deleteCommunityPostRoute = protectedProcedure.club.deleteCommunityPost.handler(
	async ({ input, context, errors }) => {
		const result = await deleteCommunityPost(
			context.db,
			context.viewer.user.id,
			input.slug,
			input.postSlug,
		);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const pinCommunityPostRoute = protectedProcedure.club.pinCommunityPost.handler(
	async ({ input, context, errors }) => {
		const result = await pinCommunityPost(
			context.db,
			context.viewer.user.id,
			input.slug,
			input.postSlug,
			input.pinned,
		);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const createCommunityCommentRoute = protectedProcedure.club.createCommunityComment.handler(
	async ({ input, context, errors }) => {
		const result = await createCommunityComment(
			context.db,
			context.viewer.user.id,
			input.slug,
			input.postSlug,
			{ body: input.body, parentId: input.parentId },
		);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const deleteCommunityCommentRoute = protectedProcedure.club.deleteCommunityComment.handler(
	async ({ input, context, errors }) => {
		const result = await deleteCommunityComment(
			context.db,
			context.viewer.user.id,
			input.slug,
			input.postSlug,
			input.commentId,
		);
		if (!result.ok) throw mapServiceError(errors, result);
		return result.data;
	},
);

export const toggleCommunityPostReactionRoute =
	protectedProcedure.club.toggleCommunityPostReaction.handler(
		async ({ input, context, errors }) => {
			const result = await toggleCommunityPostReaction(
				context.db,
				context.viewer.user.id,
				input.slug,
				input.postSlug,
				input.emoji,
			);
			if (!result.ok) throw mapServiceError(errors, result);
			return result.data;
		},
	);

export const toggleCommunityCommentReactionRoute =
	protectedProcedure.club.toggleCommunityCommentReaction.handler(
		async ({ input, context, errors }) => {
			const result = await toggleCommunityCommentReaction(
				context.db,
				context.viewer.user.id,
				input.slug,
				input.postSlug,
				input.commentId,
				input.emoji,
			);
			if (!result.ok) throw mapServiceError(errors, result);
			return result.data;
		},
	);

export const clubRouter = {
	create,
	update,
	delete: deleteClubRoute,
	getBySlug,
	listMine,
	listPublic,
	search,
	listInvites,
	join,
	requestJoin: requestJoinRoute,
	cancelRequest: cancelRequestRoute,
	invite,
	acceptInvite: acceptInviteRoute,
	declineInvite: declineInviteRoute,
	joinByCode,
	getByInviteCode,
	rotateInviteCode: rotateInviteCodeRoute,
	listMembers: listMembersRoute,
	listRequests: listRequestsRoute,
	acceptRequest: acceptRequestRoute,
	rejectRequest: rejectRequestRoute,
	setRole,
	removeMember: removeMemberRoute,
	leave,
	transferAdmin: transferAdminRoute,
	updateBooklistSettings: updateBooklistSettingsRoute,
	listBooklist: listBooklistRoute,
	listBooklistProposals: listBooklistProposalsRoute,
	addBooklistItem: addBooklistItemRoute,
	approveBooklistProposal: approveBooklistProposalRoute,
	rejectBooklistProposal: rejectBooklistProposalRoute,
	removeBooklistItem: removeBooklistItemRoute,
	createReadingSession: createReadingSessionRoute,
	listReadingSessions: listReadingSessionsRoute,
	getReadingSession: getReadingSessionRoute,
	joinReadingSession: joinReadingSessionRoute,
	leaveReadingSession: leaveReadingSessionRoute,
	advanceReadingSession: advanceReadingSessionRoute,
	cancelReadingSession: cancelReadingSessionRoute,
	abandonReadingSession: abandonReadingSessionRoute,
	addSessionShortlistItem: addSessionShortlistItemRoute,
	removeSessionShortlistItem: removeSessionShortlistItemRoute,
	fillRandomSessionShortlist: fillRandomSessionShortlistRoute,
	castSessionVotes: castSessionVotesRoute,
	setSessionVoteBlocked: setSessionVoteBlockedRoute,
	setSessionReadingOverride: setSessionReadingOverrideRoute,
	getSessionDiscussion: getSessionDiscussionRoute,
	createSessionDiscussionMessage: createSessionDiscussionMessageRoute,
	deleteSessionDiscussionMessage: deleteSessionDiscussionMessageRoute,
	toggleSessionDiscussionReaction: toggleSessionDiscussionReactionRoute,
	updateCommunitySettings: updateCommunitySettingsRoute,
	listCommunityFeed: listCommunityFeedRoute,
	getCommunityPost: getCommunityPostRoute,
	createCommunityPost: createCommunityPostRoute,
	updateCommunityPost: updateCommunityPostRoute,
	deleteCommunityPost: deleteCommunityPostRoute,
	pinCommunityPost: pinCommunityPostRoute,
	createCommunityComment: createCommunityCommentRoute,
	deleteCommunityComment: deleteCommunityCommentRoute,
	toggleCommunityPostReaction: toggleCommunityPostReactionRoute,
	toggleCommunityCommentReaction: toggleCommunityCommentReactionRoute,
};
