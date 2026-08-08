import "server-only";

import { randomUUID } from "node:crypto";

import {
	IMAGE_MIME_TYPES,
	type ImageMimeType,
	type ImageUploadPurpose,
	isImageMimeType,
	MAX_AVATAR_BYTES,
	MAX_CLUB_COVER_BYTES,
} from "@/lib/storage/constants";
import {
	buildClubAvatarKey,
	buildClubCoverKey,
	buildUserAvatarKey,
	isClubAvatarKeyForClub,
	isClubCoverKeyForClub,
	isPublicKey,
	isUserAvatarKeyForUser,
} from "@/lib/storage/keys";
import {
	deleteObject,
	getPublicBaseUrl,
	headObject,
	presignPutObject,
	publicUrlForKey,
} from "@/lib/storage/r2.server";

const UPLOAD_EXPIRES_SECONDS = 60 * 5;

export function maxBytesForImagePurpose(purpose: ImageUploadPurpose): number {
	switch (purpose) {
		case "user_avatar":
		case "club_avatar":
			return MAX_AVATAR_BYTES;
		case "club_cover":
			return MAX_CLUB_COVER_BYTES;
	}
}

export function buildImageUploadKey(
	purpose: ImageUploadPurpose,
	options: { userId: string; clubId?: string },
	contentType: ImageMimeType,
): string {
	const id = randomUUID();

	switch (purpose) {
		case "user_avatar":
			return buildUserAvatarKey(options.userId, contentType, id);
		case "club_avatar":
			if (!options.clubId) {
				throw new Error("clubId is required for club avatar uploads");
			}
			return buildClubAvatarKey(options.clubId, contentType, id);
		case "club_cover":
			if (!options.clubId) {
				throw new Error("clubId is required for club cover uploads");
			}
			return buildClubCoverKey(options.clubId, contentType, id);
	}
}

export function isKeyAllowedForPurpose(
	key: string,
	purpose: ImageUploadPurpose,
	options: { userId: string; clubId?: string },
): boolean {
	if (!isPublicKey(key)) {
		return false;
	}

	switch (purpose) {
		case "user_avatar":
			return isUserAvatarKeyForUser(key, options.userId);
		case "club_avatar":
			return options.clubId ? isClubAvatarKeyForClub(key, options.clubId) : false;
		case "club_cover":
			return options.clubId ? isClubCoverKeyForClub(key, options.clubId) : false;
	}
}

export async function createPublicImageUploadUrl(options: {
	purpose: ImageUploadPurpose;
	userId: string;
	clubId?: string;
	contentType: string;
	contentLength: number;
}): Promise<{
	uploadUrl: string;
	key: string;
	publicUrl: string;
	expiresInSeconds: number;
}> {
	if (!isImageMimeType(options.contentType)) {
		throw new Error("Unsupported image type");
	}

	const maxBytes = maxBytesForImagePurpose(options.purpose);
	if (options.contentLength > maxBytes) {
		throw new Error(`File exceeds the ${Math.round(maxBytes / (1024 * 1024))} MB limit`);
	}

	const key = buildImageUploadKey(
		options.purpose,
		{ userId: options.userId, clubId: options.clubId },
		options.contentType,
	);

	const result = await presignPutObject({
		key,
		contentType: options.contentType,
		contentLength: options.contentLength,
		expiresIn: UPLOAD_EXPIRES_SECONDS,
	});

	if (!result.publicUrl) {
		throw new Error("Image uploads must use a public/ key");
	}

	return {
		uploadUrl: result.uploadUrl,
		key: result.key,
		publicUrl: result.publicUrl,
		expiresInSeconds: UPLOAD_EXPIRES_SECONDS,
	};
}

export async function verifyUploadedImage(options: {
	key: string;
	purpose: ImageUploadPurpose;
	userId: string;
	clubId?: string;
}): Promise<{ publicUrl: string; contentType: string; contentLength: number }> {
	if (!isKeyAllowedForPurpose(options.key, options.purpose, options)) {
		throw new Error("Invalid storage key for this upload");
	}

	const head = await headObject(options.key);
	const contentType = head.contentType;
	const contentLength = head.contentLength;

	if (!contentType || !isImageMimeType(contentType)) {
		throw new Error("Uploaded object is not a supported image");
	}

	if (contentLength === null || contentLength <= 0) {
		throw new Error("Uploaded object is empty");
	}

	const maxBytes = maxBytesForImagePurpose(options.purpose);
	if (contentLength > maxBytes) {
		throw new Error("Uploaded object exceeds the size limit");
	}

	return {
		publicUrl: publicUrlForKey(options.key),
		contentType,
		contentLength,
	};
}

export function keyFromManagedPublicUrl(url: string | null | undefined): string | null {
	if (!url) {
		return null;
	}

	const base = getPublicBaseUrl();
	if (!url.startsWith(`${base}/`)) {
		return null;
	}

	const key = url.slice(base.length + 1);
	return isPublicKey(key) ? key : null;
}

export async function deleteManagedPublicObject(url: string | null | undefined): Promise<void> {
	const key = keyFromManagedPublicUrl(url);
	if (!key) {
		return;
	}

	try {
		await deleteObject(key);
	} catch {
		// Best-effort cleanup; stale objects are harmless.
	}
}

export { IMAGE_MIME_TYPES };
