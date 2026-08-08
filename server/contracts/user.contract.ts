import * as z from "zod";

import { base, paginated, paginationInputSchema } from "@/server/contracts/base.contract";

/**
 * Mirrors the `user_role` Postgres enum. Kept as a plain schema so contracts stay
 * portable to the client bundle; `user.contract.test.ts` guards against drift.
 */
export const userRoleSchema = z.enum(["user", "moderator", "admin"]);

export type UserRole = z.infer<typeof userRoleSchema>;

/** Public projection of a user row. Anything not listed here never leaves the server. */
export const userSchema = z.object({
	id: z.uuid(),
	username: z.string(),
	name: z.string(),
	email: z.email(),
	image: z.url().nullable(),
	role: userRoleSchema,
	createdAt: z.date(),
	isPrivate: z.boolean(),
});

export type User = z.infer<typeof userSchema>;

export const meContract = base
	.route({
		method: "GET",
		path: "/user/me",
		tags: ["user"],
		summary: "The signed-in user",
	})
	.output(userSchema);

export const listUsersContract = base
	.route({
		method: "GET",
		path: "/user",
		tags: ["user"],
		summary: "List users (admin only)",
	})
	.input(
		paginationInputSchema.extend({
			role: userRoleSchema.optional(),
			search: z.string().trim().min(1).max(100).optional(),
		}),
	)
	.output(paginated(userSchema));

export const updateUserRoleContract = base
	.route({
		method: "PUT",
		path: "/user/{id}/role",
		tags: ["user"],
		summary: "Change a user's role (admin only)",
	})
	.input(z.object({ id: z.uuid(), role: userRoleSchema }))
	.output(userSchema);

export const getByUsernameContract = base
	.route({
		method: "GET",
		path: "/user/{username}",
		tags: ["user"],
		summary: "Get a user by their username",
	})
	.input(z.object({ username: z.string() }))
	.output(userSchema);

export const updateAvatarContract = base
	.route({
		method: "PUT",
		path: "/user/avatar",
		tags: ["user"],
		summary: "Set the signed-in user's avatar from a verified R2 upload",
	})
	.input(
		z.object({
			key: z.string().trim().min(1).max(512),
		}),
	)
	.output(userSchema);

export const userContract = {
	me: meContract,
	list: listUsersContract,
	updateRole: updateUserRoleContract,
	getByUsername: getByUsernameContract,
	updateAvatar: updateAvatarContract,
};
