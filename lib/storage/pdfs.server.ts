import "server-only";

import {
	isIso6391Language,
	MAX_BOOKLIST_PDFS_PER_ITEM,
	MAX_PDF_BYTES,
	PDF_MIME_TYPE,
} from "@/lib/storage/constants";
import { buildBooklistPdfKey, isBooklistPdfKeyForItem, isPrivateKey } from "@/lib/storage/keys";
import {
	deleteObject,
	headObject,
	presignGetObject,
	presignPutObject,
} from "@/lib/storage/r2.server";

const UPLOAD_EXPIRES_SECONDS = 60 * 5;
const DOWNLOAD_EXPIRES_SECONDS = 60 * 10;

export function sanitizePdfFileName(fileName: string): string {
	const base = fileName.split(/[/\\]/).pop()?.trim() || "document.pdf";
	const normalized = base.replace(/[^\w.\- ()[\]]+/g, "-").slice(0, 200);
	return normalized.toLowerCase().endsWith(".pdf") ? normalized : `${normalized}.pdf`;
}

export function buildBooklistPdfUploadKey(options: { clubId: string; workId: string }): string {
	return buildBooklistPdfKey(options.clubId, options.workId, crypto.randomUUID());
}

export function isKeyAllowedForBooklistPdf(options: {
	key: string;
	clubId: string;
	workId: string;
}): boolean {
	if (!isPrivateKey(options.key)) {
		return false;
	}

	return isBooklistPdfKeyForItem(options.key, options.clubId, options.workId);
}

export async function createPrivatePdfUploadUrl(options: {
	clubId: string;
	workId: string;
	contentLength: number;
}): Promise<{
	uploadUrl: string;
	key: string;
	expiresInSeconds: number;
}> {
	if (options.contentLength > MAX_PDF_BYTES) {
		throw new Error("File exceeds the 100 MB PDF limit");
	}

	const key = buildBooklistPdfUploadKey(options);
	const result = await presignPutObject({
		key,
		contentType: PDF_MIME_TYPE,
		contentLength: options.contentLength,
		expiresIn: UPLOAD_EXPIRES_SECONDS,
	});

	return {
		uploadUrl: result.uploadUrl,
		key: result.key,
		expiresInSeconds: UPLOAD_EXPIRES_SECONDS,
	};
}

export async function verifyUploadedPdf(options: {
	key: string;
	clubId: string;
	workId: string;
}): Promise<{ key: string; contentType: string; contentLength: number }> {
	if (!isKeyAllowedForBooklistPdf(options)) {
		throw new Error("Invalid storage key for this PDF upload");
	}

	const head = await headObject(options.key);
	const contentType = head.contentType;
	const contentLength = head.contentLength;

	if (contentType !== PDF_MIME_TYPE) {
		throw new Error("Uploaded object is not a PDF");
	}

	if (contentLength === null || contentLength <= 0) {
		throw new Error("Uploaded object is empty");
	}

	if (contentLength > MAX_PDF_BYTES) {
		throw new Error("Uploaded PDF exceeds the size limit");
	}

	return {
		key: options.key,
		contentType,
		contentLength,
	};
}

export async function createPrivatePdfDownloadUrl(options: {
	key: string;
	fileName: string;
}): Promise<{ downloadUrl: string; expiresInSeconds: number }> {
	const result = await presignGetObject({
		key: options.key,
		expiresIn: DOWNLOAD_EXPIRES_SECONDS,
		fileName: sanitizePdfFileName(options.fileName),
	});

	return {
		downloadUrl: result.downloadUrl,
		expiresInSeconds: DOWNLOAD_EXPIRES_SECONDS,
	};
}

export async function deletePrivateObject(key: string): Promise<void> {
	try {
		await deleteObject(key);
	} catch {
		// Best-effort cleanup.
	}
}

export function validatePdfMetadata(input: {
	fileName: string;
	pageCount: number;
	language: string;
}): { fileName: string; pageCount: number; language: string } {
	const fileName = sanitizePdfFileName(input.fileName);
	if (!fileName) {
		throw new Error("File name is required");
	}

	if (!Number.isInteger(input.pageCount) || input.pageCount < 1 || input.pageCount > 10_000) {
		throw new Error("Page count must be between 1 and 10,000");
	}

	const language = input.language.trim().toLowerCase();
	if (!isIso6391Language(language)) {
		throw new Error("Language must be a two-letter ISO 639-1 code");
	}

	return { fileName, pageCount: input.pageCount, language };
}

export { MAX_BOOKLIST_PDFS_PER_ITEM, MAX_PDF_BYTES, PDF_MIME_TYPE };
