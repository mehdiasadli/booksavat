import { and, desc, eq, ilike, or } from "drizzle-orm";

import { user as userTable } from "@/db/schema";
import type { ViewerUser } from "@/server/context";
import { type User, userRoleSchema } from "@/server/contracts";
import { adminProcedure, protectedProcedure, publicProcedure } from "@/server/procedures";

/** Columns that are safe to return; keeps the query and the contract in step. */
const publicColumns = {
	id: userTable.id,
	username: userTable.username,
	name: userTable.name,
	email: userTable.email,
	image: userTable.image,
	role: userTable.role,
	createdAt: userTable.createdAt,
	isPrivate: userTable.isPrivate,
};

/**
 * better-auth types additional fields loosely (`role` is a plain string there), so
 * the session user is reshaped into the contract's projection.
 */
export function toPublicUser(sessionUser: ViewerUser): User {
	// `username` is optional in better-auth's inferred type (OAuth create path),
	// but every persisted user has one from the create hook / DB constraint.
	if (!sessionUser.username) {
		throw new Error(`User ${sessionUser.id} is missing a username`);
	}

	return {
		id: sessionUser.id,
		username: sessionUser.username,
		name: sessionUser.name,
		email: sessionUser.email,
		image: sessionUser.image ?? null,
		role: userRoleSchema.catch("user").parse(sessionUser.role),
		createdAt: sessionUser.createdAt,
		isPrivate: Boolean(sessionUser.isPrivate),
	};
}

export const me = protectedProcedure.user.me.handler(({ context }) =>
	toPublicUser(context.viewer.user),
);

export const getByUsername = publicProcedure.user.getByUsername.handler(
	async ({ input, context, errors }) => {
		const user = await context.db
			.select(publicColumns)
			.from(userTable)
			.where(eq(userTable.username, input.username))
			.limit(1);

		if (!user.length) {
			throw errors.NOT_FOUND({ message: "User not found" });
		}

		return user[0];
	},
);

const list = adminProcedure.user.list.handler(async ({ input, context }) => {
	const filters = [
		input.role ? eq(userTable.role, input.role) : undefined,
		input.search
			? or(ilike(userTable.name, `%${input.search}%`), ilike(userTable.email, `%${input.search}%`))
			: undefined,
	].filter((filter) => filter !== undefined);

	const where = filters.length > 0 ? and(...filters) : undefined;

	const [items, total] = await Promise.all([
		context.db
			.select(publicColumns)
			.from(userTable)
			.where(where)
			.orderBy(desc(userTable.createdAt))
			.limit(input.limit)
			.offset(input.offset),
		context.db.$count(userTable, where),
	]);

	const consumed = input.offset + items.length;

	return {
		items,
		total,
		nextOffset: consumed < total ? consumed : null,
	};
});

export const updateRole = adminProcedure.user.updateRole.handler(
	async ({ input, context, errors }) => {
		// Without this an admin could drop their own privileges and lock everyone out.
		if (input.id === context.viewer.user.id && input.role !== "admin") {
			throw errors.FORBIDDEN({ message: "You cannot remove your own admin role." });
		}

		const [updated] = await context.db
			.update(userTable)
			.set({ role: input.role })
			.where(eq(userTable.id, input.id))
			.returning(publicColumns);

		if (!updated) {
			throw errors.NOT_FOUND({ message: "No user with that id." });
		}

		return updated;
	},
);

export const userRouter = {
	me,
	list,
	updateRole,
	getByUsername,
};
