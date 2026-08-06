import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import type { Database } from "@/db";
import {
	club,
	clubMembership,
	readingLog,
	readingSession,
	sessionParticipant,
	user,
} from "@/db/schema";
import { coverUrlFromCoverId } from "@/lib/books/covers";
import {
	canShowSessionReadingProgress,
	effectiveParticipantReadingStatus,
	type SessionParticipantReadingStatus,
	summarizeParticipantReading,
} from "@/lib/clubs/session-reading";
import type { ViewerMembership } from "@/lib/clubs/visibility";
import type { ReadingLogStatus } from "@/lib/reading-logs/constants";
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

function canManageOverrides(membership: ViewerMembership): boolean {
	return Boolean(
		membership &&
			membership.status === "active" &&
			(membership.role === "admin" || membership.role === "moderator"),
	);
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

async function loadDerivedStatuses(
	db: Database,
	userIds: string[],
	workId: string,
): Promise<Map<string, ReadingLogStatus>> {
	const derived = new Map<string, ReadingLogStatus>();
	if (userIds.length === 0) return derived;

	const rows = await db
		.select({
			userId: readingLog.userId,
			status: readingLog.status,
			updatedAt: readingLog.updatedAt,
		})
		.from(readingLog)
		.where(and(eq(readingLog.workId, workId), inArray(readingLog.userId, userIds)))
		.orderBy(desc(readingLog.updatedAt));

	for (const row of rows) {
		if (!derived.has(row.userId)) {
			derived.set(row.userId, row.status);
		}
	}
	return derived;
}

export type SessionReadingParticipant = {
	userId: string;
	username: string;
	name: string;
	image: string | null;
	derivedStatus: SessionParticipantReadingStatus;
	overrideStatus: ReadingLogStatus | null;
	effectiveStatus: SessionParticipantReadingStatus;
	canOverride: boolean;
};

export type SessionReadingState = {
	selectedWork: {
		workId: string;
		title: string;
		coverUrl: string | null;
	} | null;
	readingDeadline: Date | null;
	deadlinePassed: boolean;
	participants: SessionReadingParticipant[];
	summary: Record<SessionParticipantReadingStatus, number>;
};

export async function buildSessionReadingState(
	db: Database,
	session: typeof readingSession.$inferSelect,
	membership: ViewerMembership,
	viewerUserId: string | null | undefined,
): Promise<SessionReadingState | null> {
	if (!canShowSessionReadingProgress(session.status) || !session.selectedWorkId) {
		return null;
	}

	const participantRows = await db
		.select({
			userId: sessionParticipant.userId,
			overrideStatus: sessionParticipant.readingStatusOverride,
			username: user.username,
			name: user.name,
			image: user.image,
		})
		.from(sessionParticipant)
		.innerJoin(user, eq(user.id, sessionParticipant.userId))
		.where(eq(sessionParticipant.sessionId, session.id));

	const derivedByUser = await loadDerivedStatuses(
		db,
		participantRows.map((row) => row.userId),
		session.selectedWorkId,
	);

	const manage = canManageOverrides(membership);
	const participants: SessionReadingParticipant[] = participantRows.map((row) => {
		const derived = derivedByUser.get(row.userId) ?? null;
		const override = row.overrideStatus ?? null;
		const effective = effectiveParticipantReadingStatus({
			overrideStatus: override,
			derivedStatus: derived,
		});
		return {
			userId: row.userId,
			username: row.username,
			name: row.name,
			image: row.image,
			derivedStatus: derived ?? "not_started",
			overrideStatus: override,
			effectiveStatus: effective,
			canOverride:
				isActiveMember(membership) &&
				(manage || (Boolean(viewerUserId) && row.userId === viewerUserId)),
		};
	});

	const preview = await hydrateWorkPreview(session.selectedWorkId);
	const now = Date.now();
	const deadlinePassed = Boolean(
		session.readingDeadline && session.readingDeadline.getTime() < now,
	);

	return {
		selectedWork: {
			workId: session.selectedWorkId,
			title: preview.title,
			coverUrl: preview.coverUrl,
		},
		readingDeadline: session.readingDeadline,
		deadlinePassed,
		participants,
		summary: summarizeParticipantReading(participants.map((row) => row.effectiveStatus)),
	};
}

export async function setSessionReadingOverride(
	db: Database,
	viewerUserId: string,
	slug: string,
	sessionId: string,
	input: {
		userId?: string;
		status: ReadingLogStatus | null;
	},
): Promise<ServiceResult<SessionReadingState>> {
	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	if (!isActiveMember(membership)) {
		return fail("forbidden", "Only active members can update reading progress");
	}

	const session = await requireSession(db, sessionId);
	if (!session || session.clubId !== clubRow.id) return fail("not_found", "Session not found");
	if (!canShowSessionReadingProgress(session.status)) {
		return fail(
			"bad_request",
			"Reading progress can only be updated during pending, reading, or reviewing",
		);
	}
	if (!session.selectedWorkId) {
		return fail("bad_request", "Session has no selected book yet");
	}

	const targetUserId = input.userId ?? viewerUserId;
	const manage = canManageOverrides(membership);
	if (targetUserId !== viewerUserId && !manage) {
		return fail("forbidden", "Only admins and moderators can override another member’s progress");
	}

	const [participant] = await db
		.select({ id: sessionParticipant.id })
		.from(sessionParticipant)
		.where(
			and(
				eq(sessionParticipant.sessionId, session.id),
				eq(sessionParticipant.userId, targetUserId),
			),
		)
		.limit(1);
	if (!participant) {
		return fail("not_found", "Target user is not a participant in this session");
	}

	if (input.status !== null && !["reading", "completed", "dnf"].includes(input.status)) {
		return fail("bad_request", "Invalid reading status override");
	}

	await db
		.update(sessionParticipant)
		.set({
			readingStatusOverride: input.status,
			updatedAt: new Date(),
		})
		.where(eq(sessionParticipant.id, participant.id));

	const state = await buildSessionReadingState(db, session, membership, viewerUserId);
	if (!state) return fail("bad_request", "Reading progress is unavailable for this session");
	return ok(state);
}
