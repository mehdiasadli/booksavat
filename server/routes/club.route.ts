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
};
