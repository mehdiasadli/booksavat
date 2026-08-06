import "server-only";

import { and, asc, count, eq, inArray, notInArray, sql } from "drizzle-orm";

import type { Database } from "@/db";
import {
	club,
	clubBooklistItem,
	clubMembership,
	readingSession,
	sessionParticipant,
	sessionShortlistItem,
	sessionVoteAssignment,
	user,
} from "@/db/schema";
import { coverUrlFromCoverId } from "@/lib/books/covers";
import { tryWorkId } from "@/lib/books/ids";
import { CLUB_SHORTLIST_SIZE_MAX, CLUB_SHORTLIST_SIZE_MIN } from "@/lib/clubs/constants";
import { SESSION_SHORTLIST_MIN } from "@/lib/clubs/session-lifecycle";
import {
	chipsForRole,
	DEFAULT_VOTE_CHIPS_BY_ROLE,
	leadingWorkIds,
	normalizeVoteChips,
	tallyScores,
	type VoteAssignmentInput,
	type VoteChipsByRole,
	validateVoteAssignments,
} from "@/lib/clubs/session-voting";
import type { ViewerMembership } from "@/lib/clubs/visibility";
import { olib } from "@/olib";

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

function isActiveMember(membership: ViewerMembership): boolean {
	return membership?.status === "active";
}

function canManageShortlist(membership: ViewerMembership): boolean {
	return Boolean(
		membership &&
			membership.status === "active" &&
			(membership.role === "admin" || membership.role === "moderator"),
	);
}

function canManageBlocklist(membership: ViewerMembership): boolean {
	return Boolean(membership && membership.status === "active" && membership.role === "admin");
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

async function requireSession(db: Database, sessionId: string) {
	const [row] = await db
		.select()
		.from(readingSession)
		.where(eq(readingSession.id, sessionId))
		.limit(1);
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

export function clubVoteChips(row: typeof club.$inferSelect): VoteChipsByRole {
	return normalizeVoteChips(row.voteChipsByRole) ?? DEFAULT_VOTE_CHIPS_BY_ROLE;
}

export async function listShortlistWorkIds(db: Database, sessionId: string): Promise<string[]> {
	const rows = await db
		.select({ workId: sessionShortlistItem.workId })
		.from(sessionShortlistItem)
		.where(eq(sessionShortlistItem.sessionId, sessionId));
	return rows.map((row) => row.workId);
}

export type SessionVotingState = {
	voteChipsByRole: VoteChipsByRole | null;
	shortlist: Array<{
		workId: string;
		title: string;
		coverUrl: string | null;
		score: number;
	}>;
	leadingWorkIds: string[];
	viewerChips: number[];
	viewerAssignments: VoteAssignmentInput[];
	canVote: boolean;
	canManageShortlist: boolean;
	canManageBlocklist: boolean;
	participants: Array<{
		userId: string;
		username: string;
		name: string;
		image: string | null;
		voteBlocked: boolean;
		hasVoted: boolean;
	}>;
};

export async function buildSessionVotingState(
	db: Database,
	session: typeof readingSession.$inferSelect,
	membership: ViewerMembership,
	viewerUserId: string | null | undefined,
): Promise<SessionVotingState> {
	const manageShortlist = canManageShortlist(membership);
	const manageBlocklist = canManageBlocklist(membership);
	const shortlistRows = await db
		.select({ workId: sessionShortlistItem.workId })
		.from(sessionShortlistItem)
		.where(eq(sessionShortlistItem.sessionId, session.id))
		.orderBy(asc(sessionShortlistItem.createdAt));

	const shortlistWorkIds = shortlistRows.map((row) => row.workId);
	const voteRows = await db
		.select({
			workId: sessionVoteAssignment.workId,
			points: sessionVoteAssignment.points,
			userId: sessionVoteAssignment.userId,
		})
		.from(sessionVoteAssignment)
		.where(eq(sessionVoteAssignment.sessionId, session.id));

	const scores = tallyScores(voteRows);
	const leaders = leadingWorkIds(shortlistWorkIds, scores);

	const shortlist = await Promise.all(
		shortlistWorkIds.map(async (workId) => {
			const preview = await hydrateWorkPreview(workId);
			return {
				workId,
				title: preview.title,
				coverUrl: preview.coverUrl,
				score: scores.get(workId) ?? 0,
			};
		}),
	);

	const chipsSnapshot =
		normalizeVoteChips(session.voteChipsByRole) ??
		(session.status === "proposed" ? null : DEFAULT_VOTE_CHIPS_BY_ROLE);

	const role = membership?.role ?? "member";
	const viewerChips =
		chipsSnapshot && membership?.status === "active"
			? chipsForRole(chipsSnapshot, role)
			: chipsSnapshot
				? chipsForRole(chipsSnapshot, "member")
				: [];

	const viewerAssignments = voteRows
		.filter((row) => row.userId === viewerUserId)
		.map((row) => ({ points: row.points, workId: row.workId }));

	let viewerParticipant: { voteBlocked: boolean } | null = null;
	if (viewerUserId) {
		const [row] = await db
			.select({ voteBlocked: sessionParticipant.voteBlocked })
			.from(sessionParticipant)
			.where(
				and(
					eq(sessionParticipant.sessionId, session.id),
					eq(sessionParticipant.userId, viewerUserId),
				),
			)
			.limit(1);
		viewerParticipant = row ?? null;
	}

	const canVote =
		session.status === "voting" &&
		isActiveMember(membership) &&
		Boolean(viewerParticipant) &&
		!viewerParticipant?.voteBlocked &&
		Boolean(chipsSnapshot) &&
		shortlistWorkIds.length >= SESSION_SHORTLIST_MIN;

	const participantRows = await db
		.select({
			userId: sessionParticipant.userId,
			voteBlocked: sessionParticipant.voteBlocked,
			username: user.username,
			name: user.name,
			image: user.image,
		})
		.from(sessionParticipant)
		.innerJoin(user, eq(user.id, sessionParticipant.userId))
		.where(eq(sessionParticipant.sessionId, session.id));

	const votedUserIds = new Set(voteRows.map((row) => row.userId));

	return {
		voteChipsByRole: chipsSnapshot,
		shortlist,
		leadingWorkIds: leaders,
		viewerChips,
		viewerAssignments,
		canVote,
		canManageShortlist: manageShortlist && session.status === "proposed",
		canManageBlocklist:
			manageBlocklist && (session.status === "proposed" || session.status === "voting"),
		participants: participantRows.map((row) => ({
			userId: row.userId,
			username: row.username,
			name: row.name,
			image: row.image,
			voteBlocked: row.voteBlocked,
			hasVoted: votedUserIds.has(row.userId),
		})),
	};
}

export async function addSessionShortlistItem(
	db: Database,
	viewerUserId: string,
	slug: string,
	sessionId: string,
	rawWorkId: string,
): Promise<ServiceResult<SessionVotingState>> {
	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	if (!canManageShortlist(membership)) {
		return fail("forbidden", "Only admins and moderators can edit the shortlist");
	}

	const session = await requireSession(db, sessionId);
	if (!session || session.clubId !== clubRow.id) return fail("not_found", "Session not found");
	if (session.status !== "proposed") {
		return fail("bad_request", "Shortlist can only be edited while the session is proposed");
	}

	const workId = tryWorkId(rawWorkId);
	if (!workId) return fail("bad_request", "Invalid work id");

	const [onList] = await db
		.select({ id: clubBooklistItem.id })
		.from(clubBooklistItem)
		.where(
			and(
				eq(clubBooklistItem.clubId, clubRow.id),
				eq(clubBooklistItem.workId, workId),
				eq(clubBooklistItem.status, "active"),
			),
		)
		.limit(1);
	if (!onList) return fail("bad_request", "Work must be an active booklist item");

	const [existingCount] = await db
		.select({ value: count() })
		.from(sessionShortlistItem)
		.where(eq(sessionShortlistItem.sessionId, session.id));
	if (Number(existingCount?.value ?? 0) >= CLUB_SHORTLIST_SIZE_MAX) {
		return fail("bad_request", `Shortlist cannot exceed ${CLUB_SHORTLIST_SIZE_MAX} books`);
	}

	const now = new Date();
	try {
		await db.insert(sessionShortlistItem).values({
			sessionId: session.id,
			workId,
			addedByUserId: viewerUserId,
			createdAt: now,
			updatedAt: now,
		});
	} catch {
		return fail("conflict", "That book is already on the shortlist");
	}

	return ok(await buildSessionVotingState(db, session, membership, viewerUserId));
}

export async function removeSessionShortlistItem(
	db: Database,
	viewerUserId: string,
	slug: string,
	sessionId: string,
	rawWorkId: string,
): Promise<ServiceResult<SessionVotingState>> {
	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	if (!canManageShortlist(membership)) {
		return fail("forbidden", "Only admins and moderators can edit the shortlist");
	}

	const session = await requireSession(db, sessionId);
	if (!session || session.clubId !== clubRow.id) return fail("not_found", "Session not found");
	if (session.status !== "proposed") {
		return fail("bad_request", "Shortlist can only be edited while the session is proposed");
	}

	const workId = tryWorkId(rawWorkId);
	if (!workId) return fail("bad_request", "Invalid work id");

	const deleted = await db
		.delete(sessionShortlistItem)
		.where(
			and(eq(sessionShortlistItem.sessionId, session.id), eq(sessionShortlistItem.workId, workId)),
		)
		.returning({ id: sessionShortlistItem.id });

	if (!deleted.length) return fail("not_found", "Book not on the shortlist");

	return ok(await buildSessionVotingState(db, session, membership, viewerUserId));
}

export async function fillRandomSessionShortlist(
	db: Database,
	viewerUserId: string,
	slug: string,
	sessionId: string,
	size?: number,
): Promise<ServiceResult<SessionVotingState>> {
	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	if (!canManageShortlist(membership)) {
		return fail("forbidden", "Only admins and moderators can edit the shortlist");
	}

	const session = await requireSession(db, sessionId);
	if (!session || session.clubId !== clubRow.id) return fail("not_found", "Session not found");
	if (session.status !== "proposed") {
		return fail("bad_request", "Shortlist can only be edited while the session is proposed");
	}

	const target = size ?? clubRow.defaultShortlistSize;
	if (
		!Number.isInteger(target) ||
		target < CLUB_SHORTLIST_SIZE_MIN ||
		target > CLUB_SHORTLIST_SIZE_MAX
	) {
		return fail(
			"bad_request",
			`Shortlist size must be ${CLUB_SHORTLIST_SIZE_MIN}–${CLUB_SHORTLIST_SIZE_MAX}`,
		);
	}

	const existing = await listShortlistWorkIds(db, session.id);
	const need = target - existing.length;
	if (need <= 0) {
		return ok(await buildSessionVotingState(db, session, membership, viewerUserId));
	}

	const pool = await db
		.select({ workId: clubBooklistItem.workId })
		.from(clubBooklistItem)
		.where(
			and(
				eq(clubBooklistItem.clubId, clubRow.id),
				eq(clubBooklistItem.status, "active"),
				existing.length ? notInArray(clubBooklistItem.workId, existing) : sql`true`,
			),
		)
		.orderBy(sql`random()`)
		.limit(need);

	if (pool.length === 0) {
		return fail("bad_request", "No more active booklist items available for the shortlist");
	}

	const now = new Date();
	await db.insert(sessionShortlistItem).values(
		pool.map((row) => ({
			sessionId: session.id,
			workId: row.workId,
			addedByUserId: viewerUserId,
			createdAt: now,
			updatedAt: now,
		})),
	);

	return ok(await buildSessionVotingState(db, session, membership, viewerUserId));
}

export async function castSessionVotes(
	db: Database,
	viewerUserId: string,
	slug: string,
	sessionId: string,
	assignments: VoteAssignmentInput[],
): Promise<ServiceResult<SessionVotingState>> {
	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	if (!isActiveMember(membership) || !membership) {
		return fail("forbidden", "Only active members can vote");
	}

	const session = await requireSession(db, sessionId);
	if (!session || session.clubId !== clubRow.id) return fail("not_found", "Session not found");
	if (session.status !== "voting") {
		return fail("bad_request", "Voting is only open during the voting stage");
	}

	const chips = normalizeVoteChips(session.voteChipsByRole);
	if (!chips) return fail("bad_request", "Session is missing vote chip configuration");

	const [participant] = await db
		.select({ voteBlocked: sessionParticipant.voteBlocked })
		.from(sessionParticipant)
		.where(
			and(
				eq(sessionParticipant.sessionId, session.id),
				eq(sessionParticipant.userId, viewerUserId),
			),
		)
		.limit(1);
	if (!participant) return fail("forbidden", "Join the session before voting");
	if (participant.voteBlocked)
		return fail("forbidden", "You are blocked from voting in this session");

	const shortlistWorkIds = await listShortlistWorkIds(db, session.id);
	const normalizedAssignments: VoteAssignmentInput[] = [];
	for (const assignment of assignments) {
		const workId = tryWorkId(assignment.workId);
		if (!workId) return fail("bad_request", "Invalid work id in vote");
		normalizedAssignments.push({ points: assignment.points, workId });
	}

	const validationError = validateVoteAssignments(
		normalizedAssignments,
		chipsForRole(chips, membership.role),
		new Set(shortlistWorkIds),
	);
	if (validationError) return fail("bad_request", validationError);

	const now = new Date();
	await db
		.delete(sessionVoteAssignment)
		.where(
			and(
				eq(sessionVoteAssignment.sessionId, session.id),
				eq(sessionVoteAssignment.userId, viewerUserId),
			),
		);
	await db.insert(sessionVoteAssignment).values(
		normalizedAssignments.map((assignment) => ({
			sessionId: session.id,
			userId: viewerUserId,
			points: assignment.points,
			workId: assignment.workId,
			createdAt: now,
			updatedAt: now,
		})),
	);

	return ok(await buildSessionVotingState(db, session, membership, viewerUserId));
}

export async function setSessionVoteBlocked(
	db: Database,
	viewerUserId: string,
	slug: string,
	sessionId: string,
	targetUserId: string,
	voteBlocked: boolean,
): Promise<ServiceResult<SessionVotingState>> {
	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	if (!canManageBlocklist(membership)) {
		return fail("forbidden", "Only the club admin can manage the vote blocklist");
	}

	const session = await requireSession(db, sessionId);
	if (!session || session.clubId !== clubRow.id) return fail("not_found", "Session not found");
	if (session.status !== "proposed" && session.status !== "voting") {
		return fail("bad_request", "Vote blocklist can only be changed before reading starts");
	}

	const updated = await db
		.update(sessionParticipant)
		.set({ voteBlocked, updatedAt: new Date() })
		.where(
			and(
				eq(sessionParticipant.sessionId, session.id),
				eq(sessionParticipant.userId, targetUserId),
			),
		)
		.returning({ id: sessionParticipant.id });

	if (!updated.length) return fail("not_found", "Participant not found");

	if (voteBlocked) {
		await db
			.delete(sessionVoteAssignment)
			.where(
				and(
					eq(sessionVoteAssignment.sessionId, session.id),
					eq(sessionVoteAssignment.userId, targetUserId),
				),
			);
	}

	return ok(await buildSessionVotingState(db, session, membership, viewerUserId));
}

export async function resolveVotingSelectedWork(
	db: Database,
	session: typeof readingSession.$inferSelect,
	inputSelectedWorkId: string | undefined,
): Promise<ServiceResult<string>> {
	const shortlistWorkIds = await listShortlistWorkIds(db, session.id);
	if (shortlistWorkIds.length < SESSION_SHORTLIST_MIN) {
		return fail("bad_request", `Shortlist needs at least ${SESSION_SHORTLIST_MIN} books`);
	}

	const voteRows = await db
		.select({
			workId: sessionVoteAssignment.workId,
			points: sessionVoteAssignment.points,
		})
		.from(sessionVoteAssignment)
		.where(eq(sessionVoteAssignment.sessionId, session.id));

	const leaders = leadingWorkIds(shortlistWorkIds, tallyScores(voteRows));
	const soleLeader = leaders.length === 1 ? leaders[0] : undefined;
	if (soleLeader) {
		return ok(soleLeader);
	}

	const raw = inputSelectedWorkId ?? session.selectedWorkId;
	if (!raw) {
		return fail("bad_request", "Voting is tied — pick one of the leading books to break the tie");
	}
	const workId = tryWorkId(raw);
	if (!workId) return fail("bad_request", "Invalid work id");
	if (!leaders.includes(workId)) {
		return fail("bad_request", "Tie-break pick must be one of the leading books");
	}
	return ok(workId);
}

export async function assertReadyToOpenVoting(
	db: Database,
	sessionId: string,
): Promise<ServiceResult<true>> {
	const shortlistWorkIds = await listShortlistWorkIds(db, sessionId);
	if (shortlistWorkIds.length < SESSION_SHORTLIST_MIN) {
		return fail(
			"bad_request",
			`Add at least ${SESSION_SHORTLIST_MIN} books to the shortlist before opening voting`,
		);
	}
	return ok(true);
}

export async function isWorkOnLiveSessionShortlist(
	db: Database,
	clubId: string,
	workId: string,
): Promise<boolean> {
	const [row] = await db
		.select({ id: sessionShortlistItem.id })
		.from(sessionShortlistItem)
		.innerJoin(readingSession, eq(readingSession.id, sessionShortlistItem.sessionId))
		.where(
			and(
				eq(readingSession.clubId, clubId),
				eq(sessionShortlistItem.workId, workId),
				inArray(readingSession.status, ["proposed", "voting", "pending", "reading", "reviewing"]),
			),
		)
		.limit(1);
	return Boolean(row);
}
