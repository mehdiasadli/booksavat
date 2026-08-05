import "server-only";

import { and, count, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";

import type { Database } from "@/db";
import { follow, user } from "@/db/schema";
import { canViewProfileContent } from "@/lib/follows/visibility";

export type FollowStatus = "pending" | "accepted";

export type FollowRelationship =
	| "none"
	| "self"
	| "following"
	| "pending_outgoing"
	| "pending_incoming";

export type PublicUserCard = {
	id: string;
	username: string;
	name: string;
	image: string | null;
	isPrivate: boolean;
};

export type FollowEdgeDto = {
	id: string;
	status: FollowStatus;
	createdAt: Date;
	user: PublicUserCard;
};

const userCardColumns = {
	id: user.id,
	username: user.username,
	name: user.name,
	image: user.image,
	isPrivate: user.isPrivate,
};

export async function hasAcceptedFollow(
	db: Database,
	followerId: string,
	followingId: string,
): Promise<boolean> {
	if (followerId === followingId) {
		return true;
	}

	const [row] = await db
		.select({ id: follow.id })
		.from(follow)
		.where(
			and(
				eq(follow.followerId, followerId),
				eq(follow.followingId, followingId),
				eq(follow.status, "accepted"),
			),
		)
		.limit(1);

	return Boolean(row);
}

export async function getRelationship(
	db: Database,
	viewerId: string | null | undefined,
	targetUserId: string,
): Promise<FollowRelationship> {
	if (!viewerId) {
		return "none";
	}

	if (viewerId === targetUserId) {
		return "self";
	}

	const edges = await db
		.select({
			followerId: follow.followerId,
			followingId: follow.followingId,
			status: follow.status,
		})
		.from(follow)
		.where(
			or(
				and(eq(follow.followerId, viewerId), eq(follow.followingId, targetUserId)),
				and(eq(follow.followerId, targetUserId), eq(follow.followingId, viewerId)),
			),
		);

	const outgoing = edges.find((e) => e.followerId === viewerId && e.followingId === targetUserId);
	if (outgoing?.status === "accepted") {
		return "following";
	}
	if (outgoing?.status === "pending") {
		return "pending_outgoing";
	}

	const incoming = edges.find((e) => e.followerId === targetUserId && e.followingId === viewerId);
	if (incoming?.status === "pending") {
		return "pending_incoming";
	}

	return "none";
}

export async function canViewerSeeUserContent(
	db: Database,
	owner: { id: string; isPrivate: boolean },
	viewerUserId: string | null | undefined,
): Promise<boolean> {
	if (!owner.isPrivate || (viewerUserId && viewerUserId === owner.id)) {
		return canViewProfileContent({
			isPrivate: owner.isPrivate,
			ownerUserId: owner.id,
			viewerUserId,
			viewerFollowsOwner: false,
		});
	}

	if (!viewerUserId) {
		return false;
	}

	const follows = await hasAcceptedFollow(db, viewerUserId, owner.id);
	return canViewProfileContent({
		isPrivate: owner.isPrivate,
		ownerUserId: owner.id,
		viewerUserId,
		viewerFollowsOwner: follows,
	});
}

async function requireUserByUsername(db: Database, username: string) {
	const [row] = await db
		.select({
			id: user.id,
			username: user.username,
			name: user.name,
			image: user.image,
			isPrivate: user.isPrivate,
		})
		.from(user)
		.where(eq(user.username, username))
		.limit(1);

	return row ?? null;
}

async function acceptedCounts(db: Database, userId: string) {
	const [[followers], [following]] = await Promise.all([
		db
			.select({ value: count() })
			.from(follow)
			.where(and(eq(follow.followingId, userId), eq(follow.status, "accepted"))),
		db
			.select({ value: count() })
			.from(follow)
			.where(and(eq(follow.followerId, userId), eq(follow.status, "accepted"))),
	]);

	return {
		followerCount: Number(followers?.value ?? 0),
		followingCount: Number(following?.value ?? 0),
	};
}

export async function getProfileByUsername(
	db: Database,
	username: string,
	viewerUserId: string | null | undefined,
) {
	const [row] = await db
		.select({
			id: user.id,
			username: user.username,
			name: user.name,
			email: user.email,
			image: user.image,
			role: user.role,
			createdAt: user.createdAt,
			isPrivate: user.isPrivate,
		})
		.from(user)
		.where(eq(user.username, username))
		.limit(1);

	if (!row) {
		return null;
	}

	const [relationship, counts, canViewContent] = await Promise.all([
		getRelationship(db, viewerUserId, row.id),
		acceptedCounts(db, row.id),
		canViewerSeeUserContent(db, row, viewerUserId),
	]);

	return {
		...row,
		relationship,
		canViewContent,
		...counts,
	};
}

export async function followUser(
	db: Database,
	viewerId: string,
	targetUsername: string,
): Promise<{ ok: true; relationship: FollowRelationship } | { ok: false; message: string }> {
	const target = await requireUserByUsername(db, targetUsername);
	if (!target) {
		return { ok: false, message: "User not found" };
	}

	if (target.id === viewerId) {
		return { ok: false, message: "You cannot follow yourself" };
	}

	const status: FollowStatus = target.isPrivate ? "pending" : "accepted";

	const [existing] = await db
		.select()
		.from(follow)
		.where(and(eq(follow.followerId, viewerId), eq(follow.followingId, target.id)))
		.limit(1);

	if (existing) {
		const relationship = await getRelationship(db, viewerId, target.id);
		return { ok: true, relationship };
	}

	await db.insert(follow).values({
		followerId: viewerId,
		followingId: target.id,
		status,
		updatedAt: new Date(),
	});

	return {
		ok: true,
		relationship: status === "accepted" ? "following" : "pending_outgoing",
	};
}

export async function unfollowUser(
	db: Database,
	viewerId: string,
	targetUsername: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
	const target = await requireUserByUsername(db, targetUsername);
	if (!target) {
		return { ok: false, message: "User not found" };
	}

	await db
		.delete(follow)
		.where(and(eq(follow.followerId, viewerId), eq(follow.followingId, target.id)));

	return { ok: true };
}

export async function acceptFollowRequest(
	db: Database,
	viewerId: string,
	requesterUsername: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
	const requester = await requireUserByUsername(db, requesterUsername);
	if (!requester) {
		return { ok: false, message: "User not found" };
	}

	const [updated] = await db
		.update(follow)
		.set({ status: "accepted", updatedAt: new Date() })
		.where(
			and(
				eq(follow.followerId, requester.id),
				eq(follow.followingId, viewerId),
				eq(follow.status, "pending"),
			),
		)
		.returning({ id: follow.id });

	if (!updated) {
		return { ok: false, message: "Follow request not found" };
	}

	return { ok: true };
}

export async function rejectFollowRequest(
	db: Database,
	viewerId: string,
	requesterUsername: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
	const requester = await requireUserByUsername(db, requesterUsername);
	if (!requester) {
		return { ok: false, message: "User not found" };
	}

	const deleted = await db
		.delete(follow)
		.where(
			and(
				eq(follow.followerId, requester.id),
				eq(follow.followingId, viewerId),
				eq(follow.status, "pending"),
			),
		)
		.returning({ id: follow.id });

	if (!deleted.length) {
		return { ok: false, message: "Follow request not found" };
	}

	return { ok: true };
}

export async function setPrivacy(
	db: Database,
	userId: string,
	isPrivate: boolean,
): Promise<{ isPrivate: boolean }> {
	await db.update(user).set({ isPrivate, updatedAt: new Date() }).where(eq(user.id, userId));

	// Going public: auto-accept outstanding requests (Instagram-style).
	if (!isPrivate) {
		await db
			.update(follow)
			.set({ status: "accepted", updatedAt: new Date() })
			.where(and(eq(follow.followingId, userId), eq(follow.status, "pending")));
	}

	return { isPrivate };
}

export async function listFollowing(
	db: Database,
	viewerId: string,
	pagination: { limit: number; offset: number },
) {
	const where = and(eq(follow.followerId, viewerId), eq(follow.status, "accepted"));

	const [items, totalRow] = await Promise.all([
		db
			.select({
				id: follow.id,
				status: follow.status,
				createdAt: follow.createdAt,
				user: userCardColumns,
			})
			.from(follow)
			.innerJoin(user, eq(user.id, follow.followingId))
			.where(where)
			.orderBy(desc(follow.createdAt))
			.limit(pagination.limit)
			.offset(pagination.offset),
		db.select({ value: count() }).from(follow).where(where),
	]);

	const total = Number(totalRow[0]?.value ?? 0);
	const consumed = pagination.offset + items.length;

	return {
		items: items.map((row) => ({
			id: row.id,
			status: row.status,
			createdAt: row.createdAt,
			user: row.user,
		})),
		total,
		nextOffset: consumed < total ? consumed : null,
	};
}

export async function listFollowers(
	db: Database,
	viewerId: string,
	pagination: { limit: number; offset: number },
) {
	const where = and(eq(follow.followingId, viewerId), eq(follow.status, "accepted"));

	const [items, totalRow] = await Promise.all([
		db
			.select({
				id: follow.id,
				status: follow.status,
				createdAt: follow.createdAt,
				user: userCardColumns,
			})
			.from(follow)
			.innerJoin(user, eq(user.id, follow.followerId))
			.where(where)
			.orderBy(desc(follow.createdAt))
			.limit(pagination.limit)
			.offset(pagination.offset),
		db.select({ value: count() }).from(follow).where(where),
	]);

	const total = Number(totalRow[0]?.value ?? 0);
	const consumed = pagination.offset + items.length;

	return {
		items: items.map((row) => ({
			id: row.id,
			status: row.status,
			createdAt: row.createdAt,
			user: row.user,
		})),
		total,
		nextOffset: consumed < total ? consumed : null,
	};
}

export async function listFollowRequests(
	db: Database,
	viewerId: string,
	pagination: { limit: number; offset: number },
) {
	const where = and(eq(follow.followingId, viewerId), eq(follow.status, "pending"));

	const [items, totalRow] = await Promise.all([
		db
			.select({
				id: follow.id,
				status: follow.status,
				createdAt: follow.createdAt,
				user: userCardColumns,
			})
			.from(follow)
			.innerJoin(user, eq(user.id, follow.followerId))
			.where(where)
			.orderBy(desc(follow.createdAt))
			.limit(pagination.limit)
			.offset(pagination.offset),
		db.select({ value: count() }).from(follow).where(where),
	]);

	const total = Number(totalRow[0]?.value ?? 0);
	const consumed = pagination.offset + items.length;

	return {
		items: items.map((row) => ({
			id: row.id,
			status: row.status,
			createdAt: row.createdAt,
			user: row.user,
		})),
		total,
		nextOffset: consumed < total ? consumed : null,
	};
}

export async function searchUsers(
	db: Database,
	query: string,
	pagination: { limit: number; offset: number },
	excludeUserId?: string | null,
) {
	const pattern = `%${query}%`;
	const filters = [
		or(ilike(user.username, pattern), ilike(user.name, pattern)),
		excludeUserId ? ne(user.id, excludeUserId) : undefined,
	].filter((f) => f !== undefined);

	const where = and(...filters);

	const [items, totalRow] = await Promise.all([
		db
			.select(userCardColumns)
			.from(user)
			.where(where)
			.orderBy(ascUsernameMatch(query), desc(user.createdAt))
			.limit(pagination.limit)
			.offset(pagination.offset),
		db.select({ value: count() }).from(user).where(where),
	]);

	const total = Number(totalRow[0]?.value ?? 0);
	const consumed = pagination.offset + items.length;

	return {
		items,
		total,
		nextOffset: consumed < total ? consumed : null,
	};
}

function ascUsernameMatch(query: string) {
	// Prefer exact username, then prefix, then the rest.
	return sql`CASE
		WHEN lower(${user.username}) = lower(${query}) THEN 0
		WHEN lower(${user.username}) LIKE lower(${`${query}%`}) THEN 1
		ELSE 2
	END`;
}

export async function listAcceptedFollowingIds(db: Database, viewerId: string): Promise<string[]> {
	const rows = await db
		.select({ id: follow.followingId })
		.from(follow)
		.where(and(eq(follow.followerId, viewerId), eq(follow.status, "accepted")));

	return rows.map((row) => row.id);
}

export async function loadUsersByIds(
	db: Database,
	ids: string[],
): Promise<Map<string, PublicUserCard>> {
	if (ids.length === 0) {
		return new Map();
	}

	const rows = await db.select(userCardColumns).from(user).where(inArray(user.id, ids));
	return new Map(rows.map((row) => [row.id, row]));
}
