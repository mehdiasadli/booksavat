import * as z from "zod";

import { base, paginated, paginationInputSchema } from "@/server/contracts/base.contract";
import { userRoleSchema } from "@/server/contracts/user.contract";

export const followStatusSchema = z.enum(["pending", "accepted"]);
export const followRelationshipSchema = z.enum([
	"none",
	"self",
	"following",
	"pending_outgoing",
	"pending_incoming",
]);

export const publicUserCardSchema = z.object({
	id: z.uuid(),
	username: z.string(),
	name: z.string(),
	image: z.url().nullable(),
	isPrivate: z.boolean(),
});

export const followEdgeSchema = z.object({
	id: z.uuid(),
	status: followStatusSchema,
	createdAt: z.date(),
	user: publicUserCardSchema,
});

export const userProfileSchema = z.object({
	id: z.uuid(),
	username: z.string(),
	name: z.string(),
	email: z.email(),
	image: z.url().nullable(),
	role: userRoleSchema,
	createdAt: z.date(),
	isPrivate: z.boolean(),
	canViewContent: z.boolean(),
	relationship: followRelationshipSchema,
	followerCount: z.number().int().min(0),
	followingCount: z.number().int().min(0),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

export const feedItemSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("reading_log"),
		id: z.string(),
		occurredAt: z.date(),
		user: z.object({
			id: z.uuid(),
			username: z.string(),
			name: z.string(),
			image: z.url().nullable(),
		}),
		workId: z.string(),
		title: z.string(),
		coverUrl: z.string().nullable(),
		status: z.enum(["reading", "completed", "dnf"]),
		startedAt: z.date().nullable(),
		finishedAt: z.date().nullable(),
		isReread: z.boolean(),
	}),
	z.object({
		type: z.literal("feedback"),
		id: z.string(),
		occurredAt: z.date(),
		user: z.object({
			id: z.uuid(),
			username: z.string(),
			name: z.string(),
			image: z.url().nullable(),
		}),
		workId: z.string(),
		title: z.string(),
		coverUrl: z.string().nullable(),
		rating: z.number(),
		hasReview: z.boolean(),
	}),
]);

const usernameInput = z.object({ username: z.string().trim().min(1).max(64) });

export const getProfileContract = base
	.route({
		method: "GET",
		path: "/follow/profile/{username}",
		tags: ["follow"],
		summary: "Public profile with follow relationship",
	})
	.input(usernameInput)
	.output(userProfileSchema);

export const followUserContract = base
	.route({
		method: "POST",
		path: "/follow/{username}",
		tags: ["follow"],
		summary: "Follow a user (or request if private)",
	})
	.input(usernameInput)
	.output(z.object({ relationship: followRelationshipSchema }));

export const unfollowUserContract = base
	.route({
		method: "DELETE",
		path: "/follow/{username}",
		tags: ["follow"],
		summary: "Unfollow or cancel a follow request",
	})
	.input(usernameInput)
	.output(z.object({ ok: z.literal(true) }));

export const acceptRequestContract = base
	.route({
		method: "POST",
		path: "/follow/requests/{username}/accept",
		tags: ["follow"],
		summary: "Accept an incoming follow request",
	})
	.input(usernameInput)
	.output(z.object({ ok: z.literal(true) }));

export const rejectRequestContract = base
	.route({
		method: "POST",
		path: "/follow/requests/{username}/reject",
		tags: ["follow"],
		summary: "Reject an incoming follow request",
	})
	.input(usernameInput)
	.output(z.object({ ok: z.literal(true) }));

export const listFollowingContract = base
	.route({
		method: "GET",
		path: "/follow/following",
		tags: ["follow"],
		summary: "People I follow",
	})
	.input(paginationInputSchema)
	.output(paginated(followEdgeSchema));

export const listFollowersContract = base
	.route({
		method: "GET",
		path: "/follow/followers",
		tags: ["follow"],
		summary: "People who follow me",
	})
	.input(paginationInputSchema)
	.output(paginated(followEdgeSchema));

export const listRequestsContract = base
	.route({
		method: "GET",
		path: "/follow/requests",
		tags: ["follow"],
		summary: "Incoming follow requests",
	})
	.input(paginationInputSchema)
	.output(paginated(followEdgeSchema));

export const setPrivacyContract = base
	.route({
		method: "PUT",
		path: "/follow/privacy",
		tags: ["follow"],
		summary: "Set account public or private",
	})
	.input(z.object({ isPrivate: z.boolean() }))
	.output(z.object({ isPrivate: z.boolean() }));

export const searchUsersContract = base
	.route({
		method: "GET",
		path: "/follow/search",
		tags: ["follow"],
		summary: "Search users by name or username",
	})
	.input(
		paginationInputSchema.extend({
			q: z.string().trim().min(1).max(100),
		}),
	)
	.output(paginated(publicUserCardSchema));

export const listFeedContract = base
	.route({
		method: "GET",
		path: "/follow/feed",
		tags: ["follow"],
		summary: "Home activity feed (self + following)",
	})
	.input(paginationInputSchema)
	.output(
		z.object({
			items: z.array(feedItemSchema),
			total: z.number().int().min(0),
			nextOffset: z.number().int().min(0).nullable(),
		}),
	);

export const followContract = {
	getProfile: getProfileContract,
	follow: followUserContract,
	unfollow: unfollowUserContract,
	acceptRequest: acceptRequestContract,
	rejectRequest: rejectRequestContract,
	listFollowing: listFollowingContract,
	listFollowers: listFollowersContract,
	listRequests: listRequestsContract,
	setPrivacy: setPrivacyContract,
	searchUsers: searchUsersContract,
	listFeed: listFeedContract,
};
