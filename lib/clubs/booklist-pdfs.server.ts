import "server-only";

import { and, asc, count, eq, inArray } from "drizzle-orm";

import type { Database } from "@/db";
import { club, clubBooklistDocument, clubBooklistItem, clubMembership, user } from "@/db/schema";
import { canUploadBooklistPdf } from "@/lib/clubs/booklist-permissions";
import type { ClubBooklistSettings } from "@/lib/clubs/constants";
import { canViewClubContent, type ViewerMembership } from "@/lib/clubs/visibility";
import {
	createPrivatePdfDownloadUrl,
	deletePrivateObject,
	MAX_BOOKLIST_PDFS_PER_ITEM,
	validatePdfMetadata,
	verifyUploadedPdf,
} from "@/lib/storage/pdfs.server";

export type BooklistDocumentDto = {
	id: string;
	fileName: string;
	sizeBytes: number;
	pageCount: number;
	language: string;
	createdAt: Date;
	uploadedBy: {
		id: string;
		username: string;
		name: string;
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

async function requireActiveBooklistItem(db: Database, clubId: string, workId: string) {
	const [row] = await db
		.select()
		.from(clubBooklistItem)
		.where(
			and(
				eq(clubBooklistItem.clubId, clubId),
				eq(clubBooklistItem.workId, workId),
				eq(clubBooklistItem.status, "active"),
			),
		)
		.limit(1);
	return row ?? null;
}

function settingsFromClub(row: typeof club.$inferSelect): ClubBooklistSettings {
	return {
		modsCanAdd: row.modsCanAdd,
		membersCanAdd: row.membersCanAdd,
		modsCanRemove: row.modsCanRemove,
		membersCanRemove: row.membersCanRemove,
		modsCanPropose: row.modsCanPropose,
		membersCanPropose: row.membersCanPropose,
		modsCanUploadPdf: row.modsCanUploadPdf,
		membersCanUploadPdf: row.membersCanUploadPdf,
		shortlistMode: row.shortlistMode,
		defaultShortlistSize: row.defaultShortlistSize,
		voteChipsByRole: row.voteChipsByRole as ClubBooklistSettings["voteChipsByRole"],
	};
}

async function documentCountForItem(db: Database, booklistItemId: string): Promise<number> {
	const [row] = await db
		.select({ total: count() })
		.from(clubBooklistDocument)
		.where(eq(clubBooklistDocument.booklistItemId, booklistItemId));
	return Number(row?.total ?? 0);
}

function mapDocumentRow(row: {
	document: typeof clubBooklistDocument.$inferSelect;
	user: { id: string; username: string; name: string };
}): BooklistDocumentDto {
	return {
		id: row.document.id,
		fileName: row.document.fileName,
		sizeBytes: row.document.sizeBytes,
		pageCount: row.document.pageCount,
		language: row.document.language,
		createdAt: row.document.createdAt,
		uploadedBy: {
			id: row.user.id,
			username: row.user.username,
			name: row.user.name,
		},
	};
}

export async function loadDocumentsForBooklistItems(
	db: Database,
	itemIds: string[],
): Promise<Map<string, BooklistDocumentDto[]>> {
	const map = new Map<string, BooklistDocumentDto[]>();
	if (!itemIds.length) {
		return map;
	}

	const rows = await db
		.select({
			document: clubBooklistDocument,
			user: {
				id: user.id,
				username: user.username,
				name: user.name,
			},
		})
		.from(clubBooklistDocument)
		.innerJoin(user, eq(user.id, clubBooklistDocument.uploadedByUserId))
		.where(inArray(clubBooklistDocument.booklistItemId, itemIds))
		.orderBy(asc(clubBooklistDocument.createdAt));

	for (const row of rows) {
		const itemId = row.document.booklistItemId;
		const existing = map.get(itemId) ?? [];
		existing.push(mapDocumentRow(row));
		map.set(itemId, existing);
	}

	return map;
}

export async function assertCanUploadBooklistPdf(
	db: Database,
	clubRow: typeof club.$inferSelect,
	membership: ViewerMembership,
	booklistItemId: string,
): Promise<ServiceResult<void>> {
	const settings = settingsFromClub(clubRow);
	if (!canUploadBooklistPdf(membership, settings)) {
		return fail("forbidden", "You cannot upload PDFs for this club");
	}

	const total = await documentCountForItem(db, booklistItemId);
	if (total >= MAX_BOOKLIST_PDFS_PER_ITEM) {
		return fail(
			"conflict",
			`Each booklist item can have at most ${MAX_BOOKLIST_PDFS_PER_ITEM} PDFs`,
		);
	}

	return ok(undefined);
}

export async function registerBooklistPdf(
	db: Database,
	viewerUserId: string,
	slug: string,
	workId: string,
	input: {
		key: string;
		fileName: string;
		pageCount: number;
		language: string;
	},
): Promise<ServiceResult<BooklistDocumentDto>> {
	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	if (!canViewClubContent({ visibility: clubRow.visibility, membership })) {
		return fail("forbidden", "You cannot access this club");
	}

	const item = await requireActiveBooklistItem(db, clubRow.id, workId);
	if (!item) return fail("not_found", "Book not found on the active booklist");

	const uploadCheck = await assertCanUploadBooklistPdf(db, clubRow, membership, item.id);
	if (!uploadCheck.ok) return uploadCheck;

	let metadata: ReturnType<typeof validatePdfMetadata>;
	try {
		metadata = validatePdfMetadata(input);
	} catch (error) {
		return fail("bad_request", error instanceof Error ? error.message : "Invalid PDF metadata");
	}

	let verified: Awaited<ReturnType<typeof verifyUploadedPdf>>;
	try {
		verified = await verifyUploadedPdf({
			key: input.key,
			clubId: clubRow.id,
			workId: item.workId,
		});
	} catch (error) {
		return fail("bad_request", error instanceof Error ? error.message : "Invalid PDF upload");
	}

	const [created] = await db
		.insert(clubBooklistDocument)
		.values({
			booklistItemId: item.id,
			storageKey: verified.key,
			fileName: metadata.fileName,
			sizeBytes: verified.contentLength,
			pageCount: metadata.pageCount,
			language: metadata.language,
			uploadedByUserId: viewerUserId,
		})
		.returning();

	if (!created) {
		return fail("bad_request", "Could not save PDF metadata");
	}

	const [uploader] = await db
		.select({ id: user.id, username: user.username, name: user.name })
		.from(user)
		.where(eq(user.id, viewerUserId))
		.limit(1);

	if (!uploader) {
		return fail("not_found", "User not found");
	}

	return ok(
		mapDocumentRow({
			document: created,
			user: uploader,
		}),
	);
}

export async function createBooklistPdfDownloadUrl(
	db: Database,
	viewerUserId: string,
	slug: string,
	documentId: string,
): Promise<ServiceResult<{ downloadUrl: string; expiresInSeconds: number; fileName: string }>> {
	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	if (!canViewClubContent({ visibility: clubRow.visibility, membership })) {
		return fail("forbidden", "Only club members can download PDFs");
	}

	const [row] = await db
		.select({
			document: clubBooklistDocument,
			item: clubBooklistItem,
		})
		.from(clubBooklistDocument)
		.innerJoin(clubBooklistItem, eq(clubBooklistItem.id, clubBooklistDocument.booklistItemId))
		.where(and(eq(clubBooklistDocument.id, documentId), eq(clubBooklistItem.clubId, clubRow.id)))
		.limit(1);

	if (!row) return fail("not_found", "PDF not found");

	try {
		const result = await createPrivatePdfDownloadUrl({
			key: row.document.storageKey,
			fileName: row.document.fileName,
		});
		return ok({
			downloadUrl: result.downloadUrl,
			expiresInSeconds: result.expiresInSeconds,
			fileName: row.document.fileName,
		});
	} catch (error) {
		return fail(
			"bad_request",
			error instanceof Error ? error.message : "Could not create download URL",
		);
	}
}

export async function removeBooklistPdf(
	db: Database,
	viewerUserId: string,
	slug: string,
	documentId: string,
): Promise<ServiceResult<{ ok: true }>> {
	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	const settings = settingsFromClub(clubRow);

	const [row] = await db
		.select({
			document: clubBooklistDocument,
		})
		.from(clubBooklistDocument)
		.innerJoin(clubBooklistItem, eq(clubBooklistItem.id, clubBooklistDocument.booklistItemId))
		.where(and(eq(clubBooklistDocument.id, documentId), eq(clubBooklistItem.clubId, clubRow.id)))
		.limit(1);

	if (!row) return fail("not_found", "PDF not found");

	const isOwner = row.document.uploadedByUserId === viewerUserId;
	const canManage = canUploadBooklistPdf(membership, settings);
	if (!isOwner && !canManage) {
		return fail("forbidden", "You cannot delete this PDF");
	}

	await db.delete(clubBooklistDocument).where(eq(clubBooklistDocument.id, documentId));
	await deletePrivateObject(row.document.storageKey);

	return ok({ ok: true as const });
}

export async function resolveBooklistPdfUploadContext(
	db: Database,
	viewerUserId: string,
	slug: string,
	workId: string,
): Promise<
	ServiceResult<{
		clubId: string;
		workId: string;
		booklistItemId: string;
	}>
> {
	const clubRow = await requireClubBySlug(db, slug);
	if (!clubRow) return fail("not_found", "Club not found");

	const membership = await getMembership(db, clubRow.id, viewerUserId);
	if (!canViewClubContent({ visibility: clubRow.visibility, membership })) {
		return fail("forbidden", "You cannot access this club");
	}

	const item = await requireActiveBooklistItem(db, clubRow.id, workId);
	if (!item) return fail("not_found", "Book not found on the active booklist");

	const uploadCheck = await assertCanUploadBooklistPdf(db, clubRow, membership, item.id);
	if (!uploadCheck.ok) return uploadCheck;

	return ok({
		clubId: clubRow.id,
		workId: item.workId,
		booklistItemId: item.id,
	});
}
