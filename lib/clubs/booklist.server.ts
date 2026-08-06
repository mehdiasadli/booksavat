import "server-only";

import { and, asc, count, desc, eq, inArray } from "drizzle-orm";

import type { Database } from "@/db";
import { club, clubBooklistItem, clubMembership, feedback, readingLog, user } from "@/db/schema";
import { coverUrlFromCoverId } from "@/lib/books/covers";
import { tryWorkId } from "@/lib/books/ids";
import {
	canAddToBooklist,
	canModerateBooklistProposals,
	canProposeToBooklist,
	canRemoveFromBooklist,
} from "@/lib/clubs/booklist-permissions";
import {
	CLUB_SHORTLIST_SIZE_MAX,
	CLUB_SHORTLIST_SIZE_MIN,
	type ClubBooklistItemStatus,
	type ClubBooklistSettings,
	type ClubShortlistMode,
} from "@/lib/clubs/constants";
import {
	DEFAULT_VOTE_CHIPS_BY_ROLE,
	normalizeVoteChips,
	type VoteChipsByRole,
} from "@/lib/clubs/session-voting";
import {
	canManageSettings,
	canViewClubContent,
	type ViewerMembership,
} from "@/lib/clubs/visibility";
import { olib } from "@/olib";

export type ViewerReadingStatus = "reading" | "completed" | "dnf";

export type BooklistItemDto = {
	id: string;
	workId: string;
	status: ClubBooklistItemStatus;
	title: string;
	coverUrl: string | null;
	createdAt: Date;
	updatedAt: Date;
	addedBy: {
		id: string;
		username: string;
		name: string;
		image: string | null;
	};
	viewerReadingStatus: ViewerReadingStatus | null;
	viewerHasFeedback: boolean;
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

function settingsFromClub(row: typeof club.$inferSelect): ClubBooklistSettings {
	return {
		modsCanAdd: row.modsCanAdd,
		membersCanAdd: row.membersCanAdd,
		modsCanRemove: row.modsCanRemove,
		membersCanRemove: row.membersCanRemove,
		modsCanPropose: row.modsCanPropose,
		membersCanPropose: row.membersCanPropose,
		shortlistMode: row.shortlistMode,
		defaultShortlistSize: row.defaultShortlistSize,
		voteChipsByRole: normalizeVoteChips(row.voteChipsByRole) ?? DEFAULT_VOTE_CHIPS_BY_ROLE,
	};
}

async function getMembership(
	db: Database,
	clubId: string,
	userId: string | null | undefined,
): Promise<ViewerMembership> {
	if (!userId) return null;
	const [row] = await db
		.select({ role: clubMembership.role, status: clubMembership.status })
		.from(clubMembership)
		.where(and(eq(clubMembership.clubId, clubId), eq(clubMembership.userId, userId)))
		.limit(1);
	return row ?? null;
}

async function requireClubBySlug(db: Database, slug: string) {
	const [row] = await db.select().from(club).where(eq(club.slug, slug)).limit(1);
	return row ?? null;
}

async function hydrateWorkPreview(
	workId: string,
): Promise<{ title: string; coverUrl: string | null }> {
	try {
		const work = await olib.works.get(workId);
		return {
			title: work.title?.trim() || "Untitled",
			coverUrl: coverUrlFromCoverId(work.covers?.[0], "M"),
		};
	} catch {
		return { title: "Unknown work", coverUrl: null };
	}
}

async function loadViewerIndicators(
	db: Database,
	viewerUserId: string | null | undefined,
	workIds: string[],
): Promise<{
	readingByWork: Map<string, ViewerReadingStatus>;
	feedbackWorks: Set<string>;
}> {
	const readingByWork = new Map<string, ViewerReadingStatus>();
	const feedbackWorks = new Set<string>();
	if (!viewerUserId || workIds.length === 0) {
		return { readingByWork, feedbackWorks };
	}

	const [logs, feedbackRows] = await Promise.all([
		db
			.select({
				workId: readingLog.workId,
				status: readingLog.status,
				updatedAt: readingLog.updatedAt,
			})
			.from(readingLog)
			.where(and(eq(readingLog.userId, viewerUserId), inArray(readingLog.workId, workIds)))
			.orderBy(desc(readingLog.updatedAt)),
		db
			.select({ workId: feedback.workId })
			.from(feedback)
			.where(and(eq(feedback.userId, viewerUserId), inArray(feedback.workId, workIds))),
	]);

	for (const log of logs) {
		if (!readingByWork.has(log.workId)) {
			readingByWork.set(log.workId, log.status);
		}
	}
	for (const row of feedbackRows) {
		feedbackWorks.add(row.workId);
	}

	return { readingByWork, feedbackWorks };
}

async function toItemDto(
	row: {
		item: typeof clubBooklistItem.$inferSelect;
		user: {
			id: string;
			username: string;
			name: string;
			image: string | null;
		};
	},
	indicators: {
		readingByWork: Map<string, ViewerReadingStatus>;
		feedbackWorks: Set<string>;
	},
): Promise<BooklistItemDto> {
	const preview = await hydrateWorkPreview(row.item.workId);
	return {
		id: row.item.id,
		workId: row.item.workId,
		status: row.item.status,
		title: preview.title,
		coverUrl: preview.coverUrl,
		createdAt: row.item.createdAt,
		updatedAt: row.item.updatedAt,
		addedBy: {
			id: row.user.id,
			username: row.user.username,
			name: row.user.name,
			image: row.user.image,
		},
		viewerReadingStatus: indicators.readingByWork.get(row.item.workId) ?? null,
		viewerHasFeedback: indicators.feedbackWorks.has(row.item.workId),
	};
}

export async function isBooklistWorkRemovalLocked(
	db: Database,
	clubId: string,
	workId: string,
): Promise<boolean> {
	const { isWorkLockedByLiveSession } = await import("@/lib/clubs/session.server");
	return isWorkLockedByLiveSession(db, clubId, workId);
}

export async function updateBooklistSettings(
	db: Database,
	viewerUserId: string,
	slug: string,
	patch: Partial<ClubBooklistSettings>,
): Promise<ServiceResult<ClubBooklistSettings>> {
	const row = await requireClubBySlug(db, slug);
	if (!row) return fail("not_found", "Club not found");

	const membership = await getMembership(db, row.id, viewerUserId);
	if (!canManageSettings(membership)) {
		return fail("forbidden", "Only the club admin can edit booklist settings");
	}

	const next: Partial<typeof club.$inferInsert> = { updatedAt: new Date() };

	if (patch.modsCanAdd !== undefined) next.modsCanAdd = patch.modsCanAdd;
	if (patch.membersCanAdd !== undefined) next.membersCanAdd = patch.membersCanAdd;
	if (patch.modsCanRemove !== undefined) next.modsCanRemove = patch.modsCanRemove;
	if (patch.membersCanRemove !== undefined) next.membersCanRemove = patch.membersCanRemove;
	if (patch.modsCanPropose !== undefined) next.modsCanPropose = patch.modsCanPropose;
	if (patch.membersCanPropose !== undefined) next.membersCanPropose = patch.membersCanPropose;
	if (patch.shortlistMode !== undefined)
		next.shortlistMode = patch.shortlistMode as ClubShortlistMode;

	if (patch.defaultShortlistSize !== undefined) {
		const size = patch.defaultShortlistSize;
		if (
			!Number.isInteger(size) ||
			size < CLUB_SHORTLIST_SIZE_MIN ||
			size > CLUB_SHORTLIST_SIZE_MAX
		) {
			return fail(
				"bad_request",
				`Shortlist size must be ${CLUB_SHORTLIST_SIZE_MIN}–${CLUB_SHORTLIST_SIZE_MAX}`,
			);
		}
		next.defaultShortlistSize = size;
	}

	if (patch.voteChipsByRole !== undefined) {
		const chips = normalizeVoteChips(patch.voteChipsByRole);
		if (!chips) {
			return fail(
				"bad_request",
				"Vote chips must be unique integers 1–99 per role (admin, moderator, member)",
			);
		}
		next.voteChipsByRole = chips as VoteChipsByRole;
	}

	const [updated] = await db.update(club).set(next).where(eq(club.id, row.id)).returning();
	return ok(settingsFromClub(updated));
}

export async function listBooklist(
	db: Database,
	slug: string,
	viewerUserId: string | null | undefined,
	pagination: { limit: number; offset: number },
): Promise<ServiceResult<{ items: BooklistItemDto[]; total: number; nextOffset: number | null }>> {
	const row = await requireClubBySlug(db, slug);
	if (!row) return fail("not_found", "Club not found");

	const membership = await getMembership(db, row.id, viewerUserId);
	if (!canViewClubContent({ visibility: row.visibility, membership })) {
		return fail("forbidden", "You cannot view this club’s booklist");
	}

	const where = and(eq(clubBooklistItem.clubId, row.id), eq(clubBooklistItem.status, "active"));

	const [rows, totalRow] = await Promise.all([
		db
			.select({
				item: clubBooklistItem,
				user: {
					id: user.id,
					username: user.username,
					name: user.name,
					image: user.image,
				},
			})
			.from(clubBooklistItem)
			.innerJoin(user, eq(user.id, clubBooklistItem.addedByUserId))
			.where(where)
			.orderBy(desc(clubBooklistItem.createdAt))
			.limit(pagination.limit)
			.offset(pagination.offset),
		db.select({ value: count() }).from(clubBooklistItem).where(where),
	]);

	const workIds = rows.map((r) => r.item.workId);
	const indicators = await loadViewerIndicators(db, viewerUserId, workIds);
	const items = await Promise.all(rows.map((r) => toItemDto(r, indicators)));
	const total = Number(totalRow[0]?.value ?? 0);
	const consumed = pagination.offset + items.length;

	return ok({
		items,
		total,
		nextOffset: consumed < total ? consumed : null,
	});
}

export async function listBooklistProposals(
	db: Database,
	slug: string,
	viewerUserId: string,
): Promise<ServiceResult<{ items: BooklistItemDto[] }>> {
	const row = await requireClubBySlug(db, slug);
	if (!row) return fail("not_found", "Club not found");

	const membership = await getMembership(db, row.id, viewerUserId);
	if (!canModerateBooklistProposals(membership)) {
		return fail("forbidden", "Only the club admin can view proposals");
	}

	const rows = await db
		.select({
			item: clubBooklistItem,
			user: {
				id: user.id,
				username: user.username,
				name: user.name,
				image: user.image,
			},
		})
		.from(clubBooklistItem)
		.innerJoin(user, eq(user.id, clubBooklistItem.addedByUserId))
		.where(and(eq(clubBooklistItem.clubId, row.id), eq(clubBooklistItem.status, "proposed")))
		.orderBy(asc(clubBooklistItem.createdAt));

	const workIds = rows.map((r) => r.item.workId);
	const indicators = await loadViewerIndicators(db, viewerUserId, workIds);
	const items = await Promise.all(rows.map((r) => toItemDto(r, indicators)));
	return ok({ items });
}

export async function addOrProposeBooklistItem(
	db: Database,
	viewerUserId: string,
	slug: string,
	rawWorkId: string,
): Promise<ServiceResult<BooklistItemDto>> {
	const workId = tryWorkId(rawWorkId);
	if (!workId) return fail("bad_request", "Invalid work id");

	const row = await requireClubBySlug(db, slug);
	if (!row) return fail("not_found", "Club not found");

	const membership = await getMembership(db, row.id, viewerUserId);
	const settings = settingsFromClub(row);

	const mayAdd = canAddToBooklist(membership, settings);
	const mayPropose = canProposeToBooklist(membership, settings);
	if (!mayAdd && !mayPropose) {
		return fail("forbidden", "You cannot add or propose books to this club");
	}

	const status: ClubBooklistItemStatus = mayAdd ? "active" : "proposed";

	const [existing] = await db
		.select()
		.from(clubBooklistItem)
		.where(and(eq(clubBooklistItem.clubId, row.id), eq(clubBooklistItem.workId, workId)))
		.limit(1);

	if (existing) {
		if (existing.status === "active") {
			return fail("conflict", "That book is already on the booklist");
		}
		return fail("conflict", "That book is already proposed");
	}

	const now = new Date();
	const [created] = await db
		.insert(clubBooklistItem)
		.values({
			clubId: row.id,
			workId,
			addedByUserId: viewerUserId,
			status,
			createdAt: now,
			updatedAt: now,
		})
		.returning();

	const [addedBy] = await db
		.select({
			id: user.id,
			username: user.username,
			name: user.name,
			image: user.image,
		})
		.from(user)
		.where(eq(user.id, viewerUserId))
		.limit(1);

	if (!addedBy) return fail("not_found", "User not found");

	const indicators = await loadViewerIndicators(db, viewerUserId, [workId]);
	return ok(await toItemDto({ item: created, user: addedBy }, indicators));
}

export async function approveBooklistProposal(
	db: Database,
	viewerUserId: string,
	slug: string,
	workIdRaw: string,
): Promise<ServiceResult<BooklistItemDto>> {
	const workId = tryWorkId(workIdRaw);
	if (!workId) return fail("bad_request", "Invalid work id");

	const row = await requireClubBySlug(db, slug);
	if (!row) return fail("not_found", "Club not found");

	const membership = await getMembership(db, row.id, viewerUserId);
	if (!canModerateBooklistProposals(membership)) {
		return fail("forbidden", "Only the club admin can approve proposals");
	}

	const [existing] = await db
		.select()
		.from(clubBooklistItem)
		.where(
			and(
				eq(clubBooklistItem.clubId, row.id),
				eq(clubBooklistItem.workId, workId),
				eq(clubBooklistItem.status, "proposed"),
			),
		)
		.limit(1);

	if (!existing) return fail("not_found", "Proposal not found");

	const [updated] = await db
		.update(clubBooklistItem)
		.set({ status: "active", updatedAt: new Date() })
		.where(eq(clubBooklistItem.id, existing.id))
		.returning();

	const [addedBy] = await db
		.select({
			id: user.id,
			username: user.username,
			name: user.name,
			image: user.image,
		})
		.from(user)
		.where(eq(user.id, updated.addedByUserId))
		.limit(1);

	if (!addedBy) return fail("not_found", "User not found");

	const indicators = await loadViewerIndicators(db, viewerUserId, [workId]);
	return ok(await toItemDto({ item: updated, user: addedBy }, indicators));
}

export async function rejectBooklistProposal(
	db: Database,
	viewerUserId: string,
	slug: string,
	workIdRaw: string,
): Promise<ServiceResult<{ ok: true }>> {
	const workId = tryWorkId(workIdRaw);
	if (!workId) return fail("bad_request", "Invalid work id");

	const row = await requireClubBySlug(db, slug);
	if (!row) return fail("not_found", "Club not found");

	const membership = await getMembership(db, row.id, viewerUserId);
	if (!canModerateBooklistProposals(membership)) {
		return fail("forbidden", "Only the club admin can reject proposals");
	}

	const deleted = await db
		.delete(clubBooklistItem)
		.where(
			and(
				eq(clubBooklistItem.clubId, row.id),
				eq(clubBooklistItem.workId, workId),
				eq(clubBooklistItem.status, "proposed"),
			),
		)
		.returning({ id: clubBooklistItem.id });

	if (!deleted.length) return fail("not_found", "Proposal not found");
	return ok({ ok: true as const });
}

export async function removeBooklistItem(
	db: Database,
	viewerUserId: string,
	slug: string,
	workIdRaw: string,
): Promise<ServiceResult<{ ok: true }>> {
	const workId = tryWorkId(workIdRaw);
	if (!workId) return fail("bad_request", "Invalid work id");

	const row = await requireClubBySlug(db, slug);
	if (!row) return fail("not_found", "Club not found");

	const membership = await getMembership(db, row.id, viewerUserId);
	const settings = settingsFromClub(row);
	if (!canRemoveFromBooklist(membership, settings)) {
		return fail("forbidden", "You cannot remove books from this club");
	}

	if (await isBooklistWorkRemovalLocked(db, row.id, workId)) {
		return fail(
			"conflict",
			"This book is locked by an active reading session (selected book or shortlist)",
		);
	}

	const deleted = await db
		.delete(clubBooklistItem)
		.where(
			and(
				eq(clubBooklistItem.clubId, row.id),
				eq(clubBooklistItem.workId, workId),
				eq(clubBooklistItem.status, "active"),
			),
		)
		.returning({ id: clubBooklistItem.id });

	if (!deleted.length) return fail("not_found", "Book not found on the booklist");
	return ok({ ok: true as const });
}

export function clubBooklistSettingsDto(row: typeof club.$inferSelect): ClubBooklistSettings {
	return settingsFromClub(row);
}

export function clubBooklistCapabilities(
	membership: ViewerMembership,
	settings: ClubBooklistSettings,
) {
	return {
		canAddToBooklist: canAddToBooklist(membership, settings),
		canProposeToBooklist: canProposeToBooklist(membership, settings),
		canRemoveFromBooklist: canRemoveFromBooklist(membership, settings),
		canModerateBooklistProposals: canModerateBooklistProposals(membership),
	};
}
