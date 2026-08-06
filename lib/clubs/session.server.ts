import "server-only";

import { and, count, desc, eq, inArray } from "drizzle-orm";

import type { Database } from "@/db";
import { club, clubMembership, readingSession, sessionParticipant, user } from "@/db/schema";
import { CLUB_SESSION_TITLE_MAX } from "@/lib/clubs/constants";
import {
	advanceRequiresSelectedWork,
	canAbandonSession,
	canCancelSession,
	canJoinOrLeaveSession,
	isLiveSessionStatus,
	LIVE_SESSION_STATUSES,
	nextAdvanceStatus,
	type ReadingSessionStatus,
	selectedWorkRequiredForStatus,
} from "@/lib/clubs/session-lifecycle";
import {
	assertReadyToOpenVoting,
	buildSessionVotingState,
	clubVoteChips,
	isWorkOnLiveSessionShortlist,
	resolveVotingSelectedWork,
	type SessionVotingState,
} from "@/lib/clubs/session-voting.server";
import { canViewClubContent, type ViewerMembership } from "@/lib/clubs/visibility";

export type ReadingSessionSummary = {
	id: string;
	clubId: string;
	status: ReadingSessionStatus;
	title: string | null;
	joinDeadline: Date;
	readingDeadline: Date | null;
	selectedWorkId: string | null;
	participantCount: number;
	createdAt: Date;
	updatedAt: Date;
};

export type ReadingSessionDetail = ReadingSessionSummary & {
	viewerJoined: boolean;
	canJoin: boolean;
	canLeave: boolean;
	canAdvance: boolean;
	canCancel: boolean;
	canAbandon: boolean;
	createdBy: {
		id: string;
		username: string;
		name: string;
		image: string | null;
	};
	voting: SessionVotingState;
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

function isActiveMember(membership: ViewerMembership): boolean {
	return membership?.status === "active";
}

function canCreateSession(membership: ViewerMembership): boolean {
	return Boolean(membership && membership.status === "active" && membership.role === "admin");
}

function canManageSessionStages(membership: ViewerMembership): boolean {
	return Boolean(
		membership &&
			membership.status === "active" &&
			(membership.role === "admin" || membership.role === "moderator"),
	);
}

async function requireClubBySlug(db: Database, slug: string) {
	const [row] = await db.select().from(club).where(eq(club.slug, slug)).limit(1);
	return row ?? null;
}

async function requireSession(db: Database, sessionId: string) {
	const [row] = await db
		.select()
		.from(readingSession)
		.where(eq(readingSession.id, sessionId))
		.limit(1);
	return row ?? null;
}

async function participantCount(db: Database, sessionId: string): Promise<number> {
	const [row] = await db
		.select({ value: count() })
		.from(sessionParticipant)
		.where(eq(sessionParticipant.sessionId, sessionId));
	return Number(row?.value ?? 0);
}

async function isParticipant(
	db: Database,
	sessionId: string,
	userId: string | null | undefined,
): Promise<boolean> {
	if (!userId) return false;
	const [row] = await db
		.select({ id: sessionParticipant.id })
		.from(sessionParticipant)
		.where(and(eq(sessionParticipant.sessionId, sessionId), eq(sessionParticipant.userId, userId)))
		.limit(1);
	return Boolean(row);
}

async function toSummary(
	db: Database,
	row: typeof readingSession.$inferSelect,
): Promise<ReadingSessionSummary> {
	return {
		id: row.id,
		clubId: row.clubId,
		status: row.status,
		title: row.title,
		joinDeadline: row.joinDeadline,
		readingDeadline: row.readingDeadline,
		selectedWorkId: row.selectedWorkId,
		participantCount: await participantCount(db, row.id),
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

async function toDetail(
	db: Database,
	row: typeof readingSession.$inferSelect,
	viewerUserId: string | null | undefined,
	membership: ViewerMembership,
): Promise<ReadingSessionDetail> {
	const summary = await toSummary(db, row);
	const joined = await isParticipant(db, row.id, viewerUserId);
	const manage = canManageSessionStages(membership);
	const joinLeaveOpen =
		isActiveMember(membership) &&
		canJoinOrLeaveSession({ status: row.status, joinDeadline: row.joinDeadline });

	const [createdBy] = await db
		.select({
			id: user.id,
			username: user.username,
			name: user.name,
			image: user.image,
		})
		.from(user)
		.where(eq(user.id, row.createdByUserId))
		.limit(1);

	const voting = await buildSessionVotingState(db, row, membership, viewerUserId);

	return {
		...summary,
		viewerJoined: joined,
		canJoin: joinLeaveOpen && !joined,
		canLeave: joinLeaveOpen && joined,
		canAdvance: manage && nextAdvanceStatus(row.status) !== null,
		canCancel: manage && canCancelSession(row.status),
		canAbandon: manage && canAbandonSession(row.status),
		createdBy: createdBy ?? {
			id: row.createdByUserId,
			username: "unknown",
			name: "Unknown",
			image: null,
		},
		voting,
	};
}

export async function createReadingSession(
	db: Database,
	viewerUserId: string,
	slug: string,
	input: {
		title?: string | null;
		joinDeadline: Date;
		readingDeadline?: Date | null;
	},
): Promise<ServiceResult<ReadingSessionDetail>> {
	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	if (!canCreateSession(membership)) {
		return fail("forbidden", "Only the club admin can create a reading session");
	}

	const joinDeadline = input.joinDeadline;
	if (!(joinDeadline instanceof Date) || Number.isNaN(joinDeadline.getTime())) {
		return fail("bad_request", "Invalid join deadline");
	}
	if (joinDeadline.getTime() <= Date.now()) {
		return fail("bad_request", "Join deadline must be in the future");
	}

	let readingDeadline: Date | null = null;
	if (input.readingDeadline != null) {
		if (!(input.readingDeadline instanceof Date) || Number.isNaN(input.readingDeadline.getTime())) {
			return fail("bad_request", "Invalid reading deadline");
		}
		if (input.readingDeadline.getTime() <= joinDeadline.getTime()) {
			return fail("bad_request", "Reading deadline must be after the join deadline");
		}
		readingDeadline = input.readingDeadline;
	}

	const title =
		input.title === undefined || input.title === null
			? null
			: input.title.trim().slice(0, CLUB_SESSION_TITLE_MAX) || null;

	const [live] = await db
		.select({ id: readingSession.id })
		.from(readingSession)
		.where(
			and(
				eq(readingSession.clubId, clubRow.id),
				inArray(readingSession.status, [...LIVE_SESSION_STATUSES]),
			),
		)
		.limit(1);
	if (live) {
		return fail("conflict", "This club already has an active reading session");
	}

	const now = new Date();
	const [created] = await db
		.insert(readingSession)
		.values({
			clubId: clubRow.id,
			createdByUserId: viewerUserId,
			status: "proposed",
			title,
			joinDeadline,
			readingDeadline,
			selectedWorkId: null,
			createdAt: now,
			updatedAt: now,
		})
		.returning();

	return ok(await toDetail(db, created, viewerUserId, membership));
}

export async function listReadingSessions(
	db: Database,
	slug: string,
	viewerUserId: string | null | undefined,
	pagination: { limit: number; offset: number },
): Promise<
	ServiceResult<{ items: ReadingSessionSummary[]; total: number; nextOffset: number | null }>
> {
	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	if (!canViewClubContent({ visibility: clubRow.visibility, membership })) {
		return fail("forbidden", "You cannot view this club’s sessions");
	}

	const where = eq(readingSession.clubId, clubRow.id);
	const [rows, totalRow] = await Promise.all([
		db
			.select()
			.from(readingSession)
			.where(where)
			.orderBy(desc(readingSession.createdAt))
			.limit(pagination.limit)
			.offset(pagination.offset),
		db.select({ value: count() }).from(readingSession).where(where),
	]);

	const items = await Promise.all(rows.map((row) => toSummary(db, row)));
	const total = Number(totalRow[0]?.value ?? 0);
	const consumed = pagination.offset + items.length;

	return ok({
		items,
		total,
		nextOffset: consumed < total ? consumed : null,
	});
}

export async function getReadingSession(
	db: Database,
	slug: string,
	sessionId: string,
	viewerUserId: string | null | undefined,
): Promise<ServiceResult<ReadingSessionDetail>> {
	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	if (!canViewClubContent({ visibility: clubRow.visibility, membership })) {
		return fail("forbidden", "You cannot view this club’s sessions");
	}

	const row = await requireSession(db, sessionId);
	if (!row || row.clubId !== clubRow.id) return fail("not_found", "Session not found");

	return ok(await toDetail(db, row, viewerUserId, membership));
}

export async function joinReadingSession(
	db: Database,
	viewerUserId: string,
	slug: string,
	sessionId: string,
): Promise<ServiceResult<ReadingSessionDetail>> {
	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	if (!isActiveMember(membership)) {
		return fail("forbidden", "Only active members can join a session");
	}

	const row = await requireSession(db, sessionId);
	if (!row || row.clubId !== clubRow.id) return fail("not_found", "Session not found");

	if (!canJoinOrLeaveSession({ status: row.status, joinDeadline: row.joinDeadline })) {
		return fail("bad_request", "Join window is closed for this session");
	}

	if (await isParticipant(db, row.id, viewerUserId)) {
		return ok(await toDetail(db, row, viewerUserId, membership));
	}

	const now = new Date();
	await db.insert(sessionParticipant).values({
		sessionId: row.id,
		userId: viewerUserId,
		joinedAt: now,
		createdAt: now,
		updatedAt: now,
	});

	return ok(await toDetail(db, row, viewerUserId, membership));
}

export async function leaveReadingSession(
	db: Database,
	viewerUserId: string,
	slug: string,
	sessionId: string,
): Promise<ServiceResult<ReadingSessionDetail>> {
	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	if (!isActiveMember(membership)) {
		return fail("forbidden", "Only active members can leave a session");
	}

	const row = await requireSession(db, sessionId);
	if (!row || row.clubId !== clubRow.id) return fail("not_found", "Session not found");

	if (!canJoinOrLeaveSession({ status: row.status, joinDeadline: row.joinDeadline })) {
		return fail("bad_request", "Leave window is closed for this session");
	}

	await db
		.delete(sessionParticipant)
		.where(
			and(eq(sessionParticipant.sessionId, row.id), eq(sessionParticipant.userId, viewerUserId)),
		);

	return ok(await toDetail(db, row, viewerUserId, membership));
}

export async function advanceReadingSession(
	db: Database,
	viewerUserId: string,
	slug: string,
	sessionId: string,
	input?: { selectedWorkId?: string },
): Promise<ServiceResult<ReadingSessionDetail>> {
	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	if (!canManageSessionStages(membership)) {
		return fail("forbidden", "Only admins and moderators can advance sessions");
	}

	const row = await requireSession(db, sessionId);
	if (!row || row.clubId !== clubRow.id) return fail("not_found", "Session not found");

	const next = nextAdvanceStatus(row.status);
	if (!next) return fail("bad_request", "This session cannot be advanced further");

	let selectedWorkId = row.selectedWorkId;
	let voteChipsByRole = row.voteChipsByRole;

	if (row.status === "proposed" && next === "voting") {
		const ready = await assertReadyToOpenVoting(db, row.id);
		if (!ready.ok) return ready;
		voteChipsByRole = clubVoteChips(clubRow);
	}

	if (advanceRequiresSelectedWork(row.status)) {
		const resolved = await resolveVotingSelectedWork(db, row, input?.selectedWorkId);
		if (!resolved.ok) return resolved;
		selectedWorkId = resolved.data;
	}

	if (selectedWorkRequiredForStatus(next) && !selectedWorkId) {
		return fail("bad_request", "Session is missing a selected book");
	}

	const [updated] = await db
		.update(readingSession)
		.set({
			status: next,
			selectedWorkId,
			voteChipsByRole,
			updatedAt: new Date(),
		})
		.where(eq(readingSession.id, row.id))
		.returning();

	return ok(await toDetail(db, updated, viewerUserId, membership));
}

export async function cancelReadingSession(
	db: Database,
	viewerUserId: string,
	slug: string,
	sessionId: string,
): Promise<ServiceResult<ReadingSessionDetail>> {
	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	if (!canManageSessionStages(membership)) {
		return fail("forbidden", "Only admins and moderators can cancel sessions");
	}

	const row = await requireSession(db, sessionId);
	if (!row || row.clubId !== clubRow.id) return fail("not_found", "Session not found");
	if (!canCancelSession(row.status)) {
		return fail("bad_request", "Only proposed, voting, or pending sessions can be cancelled");
	}

	const [updated] = await db
		.update(readingSession)
		.set({ status: "cancelled", updatedAt: new Date() })
		.where(eq(readingSession.id, row.id))
		.returning();

	return ok(await toDetail(db, updated, viewerUserId, membership));
}

export async function abandonReadingSession(
	db: Database,
	viewerUserId: string,
	slug: string,
	sessionId: string,
): Promise<ServiceResult<ReadingSessionDetail>> {
	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	if (!canManageSessionStages(membership)) {
		return fail("forbidden", "Only admins and moderators can abandon sessions");
	}

	const row = await requireSession(db, sessionId);
	if (!row || row.clubId !== clubRow.id) return fail("not_found", "Session not found");
	if (!canAbandonSession(row.status)) {
		return fail("bad_request", "Only reading sessions can be abandoned");
	}

	const [updated] = await db
		.update(readingSession)
		.set({ status: "abandoned", updatedAt: new Date() })
		.where(eq(readingSession.id, row.id))
		.returning();

	return ok(await toDetail(db, updated, viewerUserId, membership));
}

/** True if work is selected on a live session or on a live session shortlist. */
export async function isWorkLockedByLiveSession(
	db: Database,
	clubId: string,
	workId: string,
): Promise<boolean> {
	const [row] = await db
		.select({ id: readingSession.id })
		.from(readingSession)
		.where(
			and(
				eq(readingSession.clubId, clubId),
				eq(readingSession.selectedWorkId, workId),
				inArray(readingSession.status, [...LIVE_SESSION_STATUSES]),
			),
		)
		.limit(1);
	if (row) return true;
	return isWorkOnLiveSessionShortlist(db, clubId, workId);
}

export function clubSessionCapabilities(membership: ViewerMembership) {
	return {
		canCreateSession: canCreateSession(membership),
		canManageSessions: canManageSessionStages(membership),
	};
}

export { canCreateSession, canManageSessionStages, isLiveSessionStatus };
