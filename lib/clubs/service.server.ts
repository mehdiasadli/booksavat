import "server-only";

import { and, asc, count, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";

import type { Database } from "@/db";
import { club, clubMembership, user } from "@/db/schema";
import { clubBooklistCapabilities, clubBooklistSettingsDto } from "@/lib/clubs/booklist.server";
import {
	CLUB_DESCRIPTION_MAX,
	CLUB_NAME_MAX,
	CLUB_SLUG_MAX,
	type ClubBooklistSettings,
	type ClubMemberRole,
	type ClubMemberStatus,
	type ClubVisibility,
} from "@/lib/clubs/constants";
import { clubSessionCapabilities } from "@/lib/clubs/session.server";
import {
	canDiscoverClub,
	canInvite,
	canManageSettings,
	canModerateRequests,
	canRemoveMember,
	canSetRoles,
	canViewClubContent,
	type ViewerMembership,
} from "@/lib/clubs/visibility";
import { generateUniqueSlug, isValidSlug, slugify } from "@/lib/slugify";

export type ClubRow = typeof club.$inferSelect;
export type MembershipRow = typeof clubMembership.$inferSelect;

export type MembershipDto = {
	role: ClubMemberRole;
	status: ClubMemberStatus;
};

export type ClubSummary = {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	visibility: ClubVisibility;
	memberCount: number;
	createdAt: Date;
	updatedAt: Date;
};

export type ClubDetail = ClubSummary & {
	canViewContent: boolean;
	membership: MembershipDto | null;
	inviteCode: string | null;
	canManageSettings: boolean;
	canInvite: boolean;
	canModerateRequests: boolean;
	booklistSettings: ClubBooklistSettings;
	canAddToBooklist: boolean;
	canProposeToBooklist: boolean;
	canRemoveFromBooklist: boolean;
	canModerateBooklistProposals: boolean;
	canCreateSession: boolean;
	canManageSessions: boolean;
};

export type MemberCard = {
	id: string;
	userId: string;
	role: ClubMemberRole;
	status: ClubMemberStatus;
	createdAt: Date;
	user: {
		id: string;
		username: string;
		name: string;
		image: string | null;
	};
};

type ServiceError = {
	ok: false;
	code: "not_found" | "forbidden" | "conflict" | "bad_request";
	message: string;
};
type ServiceOk<T> = { ok: true; data: T };
type ServiceResult<T> = ServiceOk<T> | ServiceError;

function fail(code: ServiceError["code"], message: string): ServiceError {
	return { ok: false, code, message };
}

function ok<T>(data: T): ServiceOk<T> {
	return { ok: true, data };
}

function newInviteCode(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(12));
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function getMembership(
	db: Database,
	clubId: string,
	userId: string | null | undefined,
): Promise<MembershipRow | null> {
	if (!userId) return null;
	const [row] = await db
		.select()
		.from(clubMembership)
		.where(and(eq(clubMembership.clubId, clubId), eq(clubMembership.userId, userId)))
		.limit(1);
	return row ?? null;
}

function toViewerMembership(row: MembershipRow | null): ViewerMembership {
	if (!row) return null;
	return { role: row.role, status: row.status };
}

async function activeMemberCount(db: Database, clubId: string): Promise<number> {
	const [row] = await db
		.select({ value: count() })
		.from(clubMembership)
		.where(and(eq(clubMembership.clubId, clubId), eq(clubMembership.status, "active")));
	return Number(row?.value ?? 0);
}

async function toSummary(db: Database, row: ClubRow): Promise<ClubSummary> {
	return {
		id: row.id,
		name: row.name,
		slug: row.slug,
		description: row.description,
		visibility: row.visibility,
		memberCount: await activeMemberCount(db, row.id),
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

async function toDetail(
	db: Database,
	row: ClubRow,
	viewerUserId: string | null | undefined,
): Promise<ClubDetail> {
	const membershipRow = await getMembership(db, row.id, viewerUserId);
	const membership = toViewerMembership(membershipRow);
	const canView = canViewClubContent({ visibility: row.visibility, membership });
	const summary = await toSummary(db, row);
	const inviteAllowed = canInvite(membership);
	const booklistSettings = clubBooklistSettingsDto(row);
	const booklistCaps = clubBooklistCapabilities(membership, booklistSettings);
	const sessionCaps = clubSessionCapabilities(membership);

	return {
		...summary,
		canViewContent: canView,
		membership: membership ? { role: membership.role, status: membership.status } : null,
		inviteCode: inviteAllowed ? row.inviteCode : null,
		canManageSettings: canManageSettings(membership),
		canInvite: inviteAllowed,
		canModerateRequests: canModerateRequests(membership),
		booklistSettings,
		...booklistCaps,
		...sessionCaps,
	};
}

async function requireClubBySlug(db: Database, slug: string): Promise<ClubRow | null> {
	const [row] = await db.select().from(club).where(eq(club.slug, slug)).limit(1);
	return row ?? null;
}

async function requireClubById(db: Database, clubId: string): Promise<ClubRow | null> {
	const [row] = await db.select().from(club).where(eq(club.id, clubId)).limit(1);
	return row ?? null;
}

async function requireUserByUsername(db: Database, username: string) {
	const [row] = await db
		.select({ id: user.id, username: user.username, name: user.name, image: user.image })
		.from(user)
		.where(eq(user.username, username))
		.limit(1);
	return row ?? null;
}

async function slugTaken(db: Database, slug: string, excludeClubId?: string): Promise<boolean> {
	const where = excludeClubId
		? and(eq(club.slug, slug), ne(club.id, excludeClubId))
		: eq(club.slug, slug);
	const [row] = await db.select({ id: club.id }).from(club).where(where).limit(1);
	return Boolean(row);
}

/**
 * When the admin leaves/is removed: promote earliest mod, else earliest member,
 * else delete the club.
 */
export async function succeedOrDeleteClub(
	db: Database,
	clubId: string,
): Promise<"promoted" | "deleted"> {
	const candidates = await db
		.select()
		.from(clubMembership)
		.where(
			and(
				eq(clubMembership.clubId, clubId),
				eq(clubMembership.status, "active"),
				inArray(clubMembership.role, ["moderator", "member"]),
			),
		)
		.orderBy(
			sql`CASE WHEN ${clubMembership.role} = 'moderator' THEN 0 ELSE 1 END`,
			asc(clubMembership.createdAt),
		)
		.limit(1);

	const next = candidates[0];
	if (!next) {
		await db.delete(club).where(eq(club.id, clubId));
		return "deleted";
	}

	await db
		.update(clubMembership)
		.set({ role: "admin", updatedAt: new Date() })
		.where(eq(clubMembership.id, next.id));

	return "promoted";
}

export async function createClub(
	db: Database,
	ownerUserId: string,
	input: { name: string; slug?: string; description?: string | null; visibility: ClubVisibility },
): Promise<ServiceResult<ClubDetail>> {
	const name = input.name.trim();
	if (!name || name.length > CLUB_NAME_MAX) {
		return fail("bad_request", `Name must be 1–${CLUB_NAME_MAX} characters`);
	}

	const description =
		input.description === undefined || input.description === null
			? null
			: input.description.trim().slice(0, CLUB_DESCRIPTION_MAX) || null;

	const baseSlug = input.slug?.trim() ? slugify(input.slug.trim()) : slugify(name);
	if (
		!baseSlug ||
		baseSlug.length > CLUB_SLUG_MAX ||
		!isValidSlug(baseSlug.slice(0, CLUB_SLUG_MAX))
	) {
		return fail("bad_request", "Invalid slug");
	}

	const slug = await generateUniqueSlug(
		baseSlug.slice(0, CLUB_SLUG_MAX),
		async (candidate) => slugTaken(db, candidate),
		{ slugify: false },
	);

	const now = new Date();
	const [created] = await db
		.insert(club)
		.values({
			name,
			slug,
			description,
			visibility: input.visibility,
			inviteCode: newInviteCode(),
			createdAt: now,
			updatedAt: now,
		})
		.returning();

	await db.insert(clubMembership).values({
		clubId: created.id,
		userId: ownerUserId,
		role: "admin",
		status: "active",
		createdAt: now,
		updatedAt: now,
	});

	return ok(await toDetail(db, created, ownerUserId));
}

export async function updateClub(
	db: Database,
	viewerUserId: string,
	slug: string,
	patch: {
		name?: string;
		nextSlug?: string;
		description?: string | null;
		visibility?: ClubVisibility;
	},
): Promise<ServiceResult<ClubDetail>> {
	const row = await requireClubBySlug(db, slug);
	if (!row) return fail("not_found", "Club not found");

	const membership = toViewerMembership(await getMembership(db, row.id, viewerUserId));
	if (!canManageSettings(membership)) {
		return fail("forbidden", "Only the club admin can edit settings");
	}

	const next: Partial<ClubRow> = { updatedAt: new Date() };

	if (patch.name !== undefined) {
		const name = patch.name.trim();
		if (!name || name.length > CLUB_NAME_MAX) {
			return fail("bad_request", `Name must be 1–${CLUB_NAME_MAX} characters`);
		}
		next.name = name;
	}

	if (patch.description !== undefined) {
		next.description =
			patch.description === null
				? null
				: patch.description.trim().slice(0, CLUB_DESCRIPTION_MAX) || null;
	}

	if (patch.visibility !== undefined) {
		next.visibility = patch.visibility;
	}

	if (patch.nextSlug !== undefined) {
		const candidate = slugify(patch.nextSlug.trim()).slice(0, CLUB_SLUG_MAX);
		if (!isValidSlug(candidate)) {
			return fail("bad_request", "Invalid slug");
		}
		if (await slugTaken(db, candidate, row.id)) {
			return fail("conflict", "That slug is already taken");
		}
		next.slug = candidate;
	}

	const [updated] = await db.update(club).set(next).where(eq(club.id, row.id)).returning();
	return ok(await toDetail(db, updated, viewerUserId));
}

export async function deleteClub(
	db: Database,
	viewerUserId: string,
	slug: string,
): Promise<ServiceResult<{ ok: true }>> {
	const row = await requireClubBySlug(db, slug);
	if (!row) return fail("not_found", "Club not found");

	const membership = toViewerMembership(await getMembership(db, row.id, viewerUserId));
	if (!canManageSettings(membership)) {
		return fail("forbidden", "Only the club admin can delete the club");
	}

	await db.delete(club).where(eq(club.id, row.id));
	return ok({ ok: true as const });
}

export async function getClubBySlug(
	db: Database,
	slug: string,
	viewerUserId?: string | null,
): Promise<ServiceResult<ClubDetail>> {
	const row = await requireClubBySlug(db, slug);
	if (!row) return fail("not_found", "Club not found");

	const membership = toViewerMembership(await getMembership(db, row.id, viewerUserId));
	if (
		!canDiscoverClub({ visibility: row.visibility, membership }) &&
		!canViewClubContent({ visibility: row.visibility, membership })
	) {
		// invite_only and not a member/invitee: pretend not found
		if (row.visibility === "invite_only") {
			return fail("not_found", "Club not found");
		}
	}
	if (row.visibility === "invite_only" && !membership) {
		return fail("not_found", "Club not found");
	}

	return ok(await toDetail(db, row, viewerUserId));
}

export async function listMyClubs(
	db: Database,
	viewerUserId: string,
	pagination: { limit: number; offset: number },
) {
	const where = and(eq(clubMembership.userId, viewerUserId), eq(clubMembership.status, "active"));

	const [rows, totalRow] = await Promise.all([
		db
			.select({ club })
			.from(clubMembership)
			.innerJoin(club, eq(club.id, clubMembership.clubId))
			.where(where)
			.orderBy(desc(clubMembership.createdAt))
			.limit(pagination.limit)
			.offset(pagination.offset),
		db.select({ value: count() }).from(clubMembership).where(where),
	]);

	const items = await Promise.all(rows.map((r) => toSummary(db, r.club)));
	const total = Number(totalRow[0]?.value ?? 0);
	const consumed = pagination.offset + items.length;

	return {
		items,
		total,
		nextOffset: consumed < total ? consumed : null,
	};
}

export async function listPendingInvitesForUser(db: Database, viewerUserId: string) {
	const rows = await db
		.select({ club, membership: clubMembership })
		.from(clubMembership)
		.innerJoin(club, eq(club.id, clubMembership.clubId))
		.where(and(eq(clubMembership.userId, viewerUserId), eq(clubMembership.status, "invited")))
		.orderBy(desc(clubMembership.createdAt));

	return Promise.all(
		rows.map(async (r) => ({
			membershipId: r.membership.id,
			club: await toSummary(db, r.club),
			createdAt: r.membership.createdAt,
		})),
	);
}

export async function searchClubs(
	db: Database,
	query: string,
	viewerUserId: string | null | undefined,
	pagination: { limit: number; offset: number },
) {
	const pattern = `%${query}%`;

	// Base: public + private discoverable; invite_only only if viewer is member/invited.
	const membershipClubIds = viewerUserId
		? (
				await db
					.select({ clubId: clubMembership.clubId })
					.from(clubMembership)
					.where(
						and(
							eq(clubMembership.userId, viewerUserId),
							inArray(clubMembership.status, ["active", "invited"]),
						),
					)
			).map((r) => r.clubId)
		: [];

	const visibilityFilter =
		membershipClubIds.length > 0
			? or(
					inArray(club.visibility, ["public", "private"]),
					and(eq(club.visibility, "invite_only"), inArray(club.id, membershipClubIds)),
				)
			: inArray(club.visibility, ["public", "private"]);

	const where = and(
		visibilityFilter,
		or(ilike(club.name, pattern), ilike(club.slug, pattern), ilike(club.description, pattern)),
	);

	const [rows, totalRow] = await Promise.all([
		db
			.select()
			.from(club)
			.where(where)
			.orderBy(asc(club.name))
			.limit(pagination.limit)
			.offset(pagination.offset),
		db.select({ value: count() }).from(club).where(where),
	]);

	const items = await Promise.all(rows.map((r) => toSummary(db, r)));
	const total = Number(totalRow[0]?.value ?? 0);
	const consumed = pagination.offset + items.length;

	return {
		items,
		total,
		nextOffset: consumed < total ? consumed : null,
	};
}

export async function listPublicClubs(db: Database, pagination: { limit: number; offset: number }) {
	const where = eq(club.visibility, "public");
	const [rows, totalRow] = await Promise.all([
		db
			.select()
			.from(club)
			.where(where)
			.orderBy(desc(club.createdAt))
			.limit(pagination.limit)
			.offset(pagination.offset),
		db.select({ value: count() }).from(club).where(where),
	]);

	const items = await Promise.all(rows.map((r) => toSummary(db, r)));
	const total = Number(totalRow[0]?.value ?? 0);
	const consumed = pagination.offset + items.length;

	return {
		items,
		total,
		nextOffset: consumed < total ? consumed : null,
	};
}

export async function joinPublicClub(
	db: Database,
	viewerUserId: string,
	slug: string,
): Promise<ServiceResult<ClubDetail>> {
	const row = await requireClubBySlug(db, slug);
	if (!row) return fail("not_found", "Club not found");
	if (row.visibility !== "public") {
		return fail("forbidden", "This club is not open to join");
	}

	const existing = await getMembership(db, row.id, viewerUserId);
	if (existing?.status === "active") {
		return ok(await toDetail(db, row, viewerUserId));
	}

	const now = new Date();
	if (existing) {
		await db
			.update(clubMembership)
			.set({ status: "active", role: "member", updatedAt: now })
			.where(eq(clubMembership.id, existing.id));
	} else {
		await db.insert(clubMembership).values({
			clubId: row.id,
			userId: viewerUserId,
			role: "member",
			status: "active",
			createdAt: now,
			updatedAt: now,
		});
	}

	return ok(await toDetail(db, row, viewerUserId));
}

export async function requestJoin(
	db: Database,
	viewerUserId: string,
	slug: string,
): Promise<ServiceResult<ClubDetail>> {
	const row = await requireClubBySlug(db, slug);
	if (!row) return fail("not_found", "Club not found");
	if (row.visibility !== "private") {
		return fail("forbidden", "Join requests are only for private clubs");
	}

	const existing = await getMembership(db, row.id, viewerUserId);
	if (existing?.status === "active") {
		return ok(await toDetail(db, row, viewerUserId));
	}
	if (existing?.status === "invited") {
		return fail("conflict", "You already have an invite — accept it instead");
	}

	const now = new Date();
	if (existing?.status === "requested") {
		return ok(await toDetail(db, row, viewerUserId));
	}

	if (existing) {
		await db
			.update(clubMembership)
			.set({ status: "requested", role: "member", updatedAt: now })
			.where(eq(clubMembership.id, existing.id));
	} else {
		await db.insert(clubMembership).values({
			clubId: row.id,
			userId: viewerUserId,
			role: "member",
			status: "requested",
			createdAt: now,
			updatedAt: now,
		});
	}

	return ok(await toDetail(db, row, viewerUserId));
}

export async function cancelRequest(
	db: Database,
	viewerUserId: string,
	slug: string,
): Promise<ServiceResult<ClubDetail>> {
	const row = await requireClubBySlug(db, slug);
	if (!row) return fail("not_found", "Club not found");

	const existing = await getMembership(db, row.id, viewerUserId);
	if (!existing || existing.status !== "requested") {
		return fail("not_found", "No pending request");
	}

	await db.delete(clubMembership).where(eq(clubMembership.id, existing.id));
	return ok(await toDetail(db, row, viewerUserId));
}

export async function inviteByUsername(
	db: Database,
	viewerUserId: string,
	slug: string,
	username: string,
): Promise<ServiceResult<{ ok: true }>> {
	const row = await requireClubBySlug(db, slug);
	if (!row) return fail("not_found", "Club not found");

	const actor = toViewerMembership(await getMembership(db, row.id, viewerUserId));
	if (!canInvite(actor)) {
		return fail("forbidden", "You cannot invite people to this club");
	}

	const target = await requireUserByUsername(db, username);
	if (!target) return fail("not_found", "User not found");
	if (target.id === viewerUserId) {
		return fail("bad_request", "You cannot invite yourself");
	}

	const existing = await getMembership(db, row.id, target.id);
	if (existing?.status === "active") {
		return fail("conflict", "User is already a member");
	}

	const now = new Date();
	if (existing) {
		await db
			.update(clubMembership)
			.set({ status: "invited", role: "member", updatedAt: now })
			.where(eq(clubMembership.id, existing.id));
	} else {
		await db.insert(clubMembership).values({
			clubId: row.id,
			userId: target.id,
			role: "member",
			status: "invited",
			createdAt: now,
			updatedAt: now,
		});
	}

	return ok({ ok: true as const });
}

export async function acceptInvite(
	db: Database,
	viewerUserId: string,
	slug: string,
): Promise<ServiceResult<ClubDetail>> {
	const row = await requireClubBySlug(db, slug);
	if (!row) return fail("not_found", "Club not found");

	const existing = await getMembership(db, row.id, viewerUserId);
	if (!existing || existing.status !== "invited") {
		return fail("not_found", "No invite found");
	}

	await db
		.update(clubMembership)
		.set({ status: "active", updatedAt: new Date() })
		.where(eq(clubMembership.id, existing.id));

	return ok(await toDetail(db, row, viewerUserId));
}

export async function declineInvite(
	db: Database,
	viewerUserId: string,
	slug: string,
): Promise<ServiceResult<{ ok: true }>> {
	const row = await requireClubBySlug(db, slug);
	if (!row) return fail("not_found", "Club not found");

	const existing = await getMembership(db, row.id, viewerUserId);
	if (!existing || existing.status !== "invited") {
		return fail("not_found", "No invite found");
	}

	await db.delete(clubMembership).where(eq(clubMembership.id, existing.id));
	return ok({ ok: true as const });
}

export async function joinByInviteCode(
	db: Database,
	viewerUserId: string,
	inviteCode: string,
): Promise<ServiceResult<ClubDetail>> {
	const [row] = await db.select().from(club).where(eq(club.inviteCode, inviteCode)).limit(1);
	if (!row) return fail("not_found", "Invite link is invalid");

	const existing = await getMembership(db, row.id, viewerUserId);
	if (existing?.status === "active") {
		return ok(await toDetail(db, row, viewerUserId));
	}

	const now = new Date();
	if (existing) {
		await db
			.update(clubMembership)
			.set({ status: "active", role: "member", updatedAt: now })
			.where(eq(clubMembership.id, existing.id));
	} else {
		await db.insert(clubMembership).values({
			clubId: row.id,
			userId: viewerUserId,
			role: "member",
			status: "active",
			createdAt: now,
			updatedAt: now,
		});
	}

	return ok(await toDetail(db, row, viewerUserId));
}

export async function rotateInviteCode(
	db: Database,
	viewerUserId: string,
	slug: string,
): Promise<ServiceResult<{ inviteCode: string }>> {
	const row = await requireClubBySlug(db, slug);
	if (!row) return fail("not_found", "Club not found");

	const actor = toViewerMembership(await getMembership(db, row.id, viewerUserId));
	if (!canInvite(actor)) {
		return fail("forbidden", "You cannot rotate the invite link");
	}

	const inviteCode = newInviteCode();
	await db.update(club).set({ inviteCode, updatedAt: new Date() }).where(eq(club.id, row.id));

	return ok({ inviteCode });
}

export async function listMembers(
	db: Database,
	slug: string,
	viewerUserId: string | null | undefined,
	pagination: { limit: number; offset: number },
): Promise<ServiceResult<{ items: MemberCard[]; total: number; nextOffset: number | null }>> {
	const row = await requireClubBySlug(db, slug);
	if (!row) return fail("not_found", "Club not found");

	const membership = toViewerMembership(await getMembership(db, row.id, viewerUserId));
	if (!canViewClubContent({ visibility: row.visibility, membership })) {
		return fail("forbidden", "You cannot view members of this club");
	}

	const where = and(eq(clubMembership.clubId, row.id), eq(clubMembership.status, "active"));

	const [rows, totalRow] = await Promise.all([
		db
			.select({
				membership: clubMembership,
				user: {
					id: user.id,
					username: user.username,
					name: user.name,
					image: user.image,
				},
			})
			.from(clubMembership)
			.innerJoin(user, eq(user.id, clubMembership.userId))
			.where(where)
			.orderBy(
				sql`CASE ${clubMembership.role}
					WHEN 'admin' THEN 0
					WHEN 'moderator' THEN 1
					ELSE 2
				END`,
				asc(clubMembership.createdAt),
			)
			.limit(pagination.limit)
			.offset(pagination.offset),
		db.select({ value: count() }).from(clubMembership).where(where),
	]);

	const items: MemberCard[] = rows.map((r) => ({
		id: r.membership.id,
		userId: r.membership.userId,
		role: r.membership.role,
		status: r.membership.status,
		createdAt: r.membership.createdAt,
		user: r.user,
	}));

	const total = Number(totalRow[0]?.value ?? 0);
	const consumed = pagination.offset + items.length;

	return ok({
		items,
		total,
		nextOffset: consumed < total ? consumed : null,
	});
}

export async function listRequests(
	db: Database,
	viewerUserId: string,
	slug: string,
): Promise<ServiceResult<{ items: MemberCard[] }>> {
	const row = await requireClubBySlug(db, slug);
	if (!row) return fail("not_found", "Club not found");

	const actor = toViewerMembership(await getMembership(db, row.id, viewerUserId));
	if (!canModerateRequests(actor)) {
		return fail("forbidden", "You cannot manage join requests");
	}

	const rows = await db
		.select({
			membership: clubMembership,
			user: {
				id: user.id,
				username: user.username,
				name: user.name,
				image: user.image,
			},
		})
		.from(clubMembership)
		.innerJoin(user, eq(user.id, clubMembership.userId))
		.where(and(eq(clubMembership.clubId, row.id), eq(clubMembership.status, "requested")))
		.orderBy(desc(clubMembership.createdAt));

	return ok({
		items: rows.map((r) => ({
			id: r.membership.id,
			userId: r.membership.userId,
			role: r.membership.role,
			status: r.membership.status,
			createdAt: r.membership.createdAt,
			user: r.user,
		})),
	});
}

export async function acceptRequest(
	db: Database,
	viewerUserId: string,
	slug: string,
	username: string,
): Promise<ServiceResult<{ ok: true }>> {
	const row = await requireClubBySlug(db, slug);
	if (!row) return fail("not_found", "Club not found");

	const actor = toViewerMembership(await getMembership(db, row.id, viewerUserId));
	if (!canModerateRequests(actor)) {
		return fail("forbidden", "You cannot manage join requests");
	}

	const target = await requireUserByUsername(db, username);
	if (!target) return fail("not_found", "User not found");

	const existing = await getMembership(db, row.id, target.id);
	if (!existing || existing.status !== "requested") {
		return fail("not_found", "Join request not found");
	}

	await db
		.update(clubMembership)
		.set({ status: "active", updatedAt: new Date() })
		.where(eq(clubMembership.id, existing.id));

	return ok({ ok: true as const });
}

export async function rejectRequest(
	db: Database,
	viewerUserId: string,
	slug: string,
	username: string,
): Promise<ServiceResult<{ ok: true }>> {
	const row = await requireClubBySlug(db, slug);
	if (!row) return fail("not_found", "Club not found");

	const actor = toViewerMembership(await getMembership(db, row.id, viewerUserId));
	if (!canModerateRequests(actor)) {
		return fail("forbidden", "You cannot manage join requests");
	}

	const target = await requireUserByUsername(db, username);
	if (!target) return fail("not_found", "User not found");

	const existing = await getMembership(db, row.id, target.id);
	if (!existing || existing.status !== "requested") {
		return fail("not_found", "Join request not found");
	}

	await db.delete(clubMembership).where(eq(clubMembership.id, existing.id));
	return ok({ ok: true as const });
}

export async function setMemberRole(
	db: Database,
	viewerUserId: string,
	slug: string,
	username: string,
	role: Exclude<ClubMemberRole, "admin">,
): Promise<ServiceResult<{ ok: true }>> {
	const row = await requireClubBySlug(db, slug);
	if (!row) return fail("not_found", "Club not found");

	const actor = toViewerMembership(await getMembership(db, row.id, viewerUserId));
	if (!canSetRoles(actor)) {
		return fail("forbidden", "Only the admin can change roles");
	}

	const target = await requireUserByUsername(db, username);
	if (!target) return fail("not_found", "User not found");

	const existing = await getMembership(db, row.id, target.id);
	if (!existing || existing.status !== "active") {
		return fail("not_found", "Member not found");
	}
	if (existing.role === "admin") {
		return fail("forbidden", "Transfer admin instead of demoting the admin");
	}

	await db
		.update(clubMembership)
		.set({ role, updatedAt: new Date() })
		.where(eq(clubMembership.id, existing.id));

	return ok({ ok: true as const });
}

export async function removeMember(
	db: Database,
	viewerUserId: string,
	slug: string,
	username: string,
): Promise<ServiceResult<{ ok: true }>> {
	const row = await requireClubBySlug(db, slug);
	if (!row) return fail("not_found", "Club not found");

	const actorRow = await getMembership(db, row.id, viewerUserId);
	const actor = toViewerMembership(actorRow);

	const target = await requireUserByUsername(db, username);
	if (!target) return fail("not_found", "User not found");

	const existing = await getMembership(db, row.id, target.id);
	if (!existing) return fail("not_found", "Member not found");

	if (!canRemoveMember(actor, { role: existing.role, status: existing.status })) {
		return fail("forbidden", "You cannot remove this member");
	}

	await db.delete(clubMembership).where(eq(clubMembership.id, existing.id));
	return ok({ ok: true as const });
}

export async function leaveClub(
	db: Database,
	viewerUserId: string,
	slug: string,
): Promise<ServiceResult<{ deleted: boolean }>> {
	const row = await requireClubBySlug(db, slug);
	if (!row) return fail("not_found", "Club not found");

	const existing = await getMembership(db, row.id, viewerUserId);
	if (!existing || existing.status !== "active") {
		return fail("not_found", "You are not a member of this club");
	}

	const wasAdmin = existing.role === "admin";
	await db.delete(clubMembership).where(eq(clubMembership.id, existing.id));

	if (wasAdmin) {
		const result = await succeedOrDeleteClub(db, row.id);
		return ok({ deleted: result === "deleted" });
	}

	return ok({ deleted: false });
}

export async function transferAdmin(
	db: Database,
	viewerUserId: string,
	slug: string,
	username: string,
): Promise<ServiceResult<{ ok: true }>> {
	const row = await requireClubBySlug(db, slug);
	if (!row) return fail("not_found", "Club not found");

	const actor = await getMembership(db, row.id, viewerUserId);
	if (!actor || actor.status !== "active" || actor.role !== "admin") {
		return fail("forbidden", "Only the admin can transfer ownership");
	}

	const target = await requireUserByUsername(db, username);
	if (!target) return fail("not_found", "User not found");
	if (target.id === viewerUserId) {
		return fail("bad_request", "Pick another member");
	}

	const targetMembership = await getMembership(db, row.id, target.id);
	if (!targetMembership || targetMembership.status !== "active") {
		return fail("not_found", "Target must be an active member");
	}

	const now = new Date();
	await db
		.update(clubMembership)
		.set({ role: "member", updatedAt: now })
		.where(eq(clubMembership.id, actor.id));
	await db
		.update(clubMembership)
		.set({ role: "admin", updatedAt: now })
		.where(eq(clubMembership.id, targetMembership.id));

	return ok({ ok: true as const });
}

/** Used by join page preview without exposing invite_only clubs via slug. */
export async function getClubByInviteCode(
	db: Database,
	inviteCode: string,
	viewerUserId?: string | null,
): Promise<ServiceResult<ClubDetail>> {
	const [row] = await db.select().from(club).where(eq(club.inviteCode, inviteCode)).limit(1);
	if (!row) return fail("not_found", "Invite link is invalid");
	return ok(await toDetail(db, row, viewerUserId));
}

export async function requireClubByIdForSeed(db: Database, clubId: string) {
	return requireClubById(db, clubId);
}
