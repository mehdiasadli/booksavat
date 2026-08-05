import { listHomeFeed } from "@/lib/follows/feed.server";
import {
	acceptFollowRequest,
	followUser,
	getProfileByUsername,
	listFollowers,
	listFollowing,
	listFollowRequests,
	rejectFollowRequest,
	searchUsers,
	setPrivacy,
	unfollowUser,
} from "@/lib/follows/service.server";
import { protectedProcedure, publicProcedure } from "@/server/procedures";

export const getProfile = publicProcedure.follow.getProfile.handler(
	async ({ input, context, errors }) => {
		const profile = await getProfileByUsername(
			context.db,
			input.username,
			context.session?.user?.id,
		);

		if (!profile) {
			throw errors.NOT_FOUND({ message: "User not found" });
		}

		return profile;
	},
);

export const follow = protectedProcedure.follow.follow.handler(
	async ({ input, context, errors }) => {
		const result = await followUser(context.db, context.viewer.user.id, input.username);
		if (!result.ok) {
			throw errors.NOT_FOUND({ message: result.message });
		}
		return { relationship: result.relationship };
	},
);

export const unfollow = protectedProcedure.follow.unfollow.handler(
	async ({ input, context, errors }) => {
		const result = await unfollowUser(context.db, context.viewer.user.id, input.username);
		if (!result.ok) {
			throw errors.NOT_FOUND({ message: result.message });
		}
		return { ok: true as const };
	},
);

export const acceptRequest = protectedProcedure.follow.acceptRequest.handler(
	async ({ input, context, errors }) => {
		const result = await acceptFollowRequest(context.db, context.viewer.user.id, input.username);
		if (!result.ok) {
			throw errors.NOT_FOUND({ message: result.message });
		}
		return { ok: true as const };
	},
);

export const rejectRequest = protectedProcedure.follow.rejectRequest.handler(
	async ({ input, context, errors }) => {
		const result = await rejectFollowRequest(context.db, context.viewer.user.id, input.username);
		if (!result.ok) {
			throw errors.NOT_FOUND({ message: result.message });
		}
		return { ok: true as const };
	},
);

export const listFollowingRoute = protectedProcedure.follow.listFollowing.handler(
	async ({ input, context }) => {
		return listFollowing(context.db, context.viewer.user.id, {
			limit: input.limit,
			offset: input.offset,
		});
	},
);

export const listFollowersRoute = protectedProcedure.follow.listFollowers.handler(
	async ({ input, context }) => {
		return listFollowers(context.db, context.viewer.user.id, {
			limit: input.limit,
			offset: input.offset,
		});
	},
);

export const listRequestsRoute = protectedProcedure.follow.listRequests.handler(
	async ({ input, context }) => {
		return listFollowRequests(context.db, context.viewer.user.id, {
			limit: input.limit,
			offset: input.offset,
		});
	},
);

export const setPrivacyRoute = protectedProcedure.follow.setPrivacy.handler(
	async ({ input, context }) => {
		return setPrivacy(context.db, context.viewer.user.id, input.isPrivate);
	},
);

export const searchUsersRoute = publicProcedure.follow.searchUsers.handler(
	async ({ input, context }) => {
		return searchUsers(
			context.db,
			input.q,
			{ limit: input.limit, offset: input.offset },
			context.session?.user?.id,
		);
	},
);

export const listFeed = protectedProcedure.follow.listFeed.handler(async ({ input, context }) => {
	return listHomeFeed(context.db, context.viewer.user.id, {
		limit: input.limit,
		offset: input.offset,
	});
});

export const followRouter = {
	getProfile,
	follow,
	unfollow,
	acceptRequest,
	rejectRequest,
	listFollowing: listFollowingRoute,
	listFollowers: listFollowersRoute,
	listRequests: listRequestsRoute,
	setPrivacy: setPrivacyRoute,
	searchUsers: searchUsersRoute,
	listFeed,
};
