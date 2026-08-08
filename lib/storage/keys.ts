import {
	DEV_UPLOAD_KEY_PREFIX,
	IMAGE_EXTENSION_BY_MIME,
	type ImageMimeType,
	PRIVATE_KEY_PREFIX,
	PUBLIC_KEY_PREFIX,
} from "@/lib/storage/constants";

function sanitizeSegment(value: string): string {
	return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "x";
}

export function buildPublicKey(parts: string[], ext: string): string {
	const path = parts.map(sanitizeSegment).join("/");
	const normalizedExt = ext.replace(/^\./, "").toLowerCase();
	return `${PUBLIC_KEY_PREFIX}${path}.${normalizedExt}`;
}

export function buildPrivateKey(parts: string[], ext: string): string {
	const path = parts.map(sanitizeSegment).join("/");
	const normalizedExt = ext.replace(/^\./, "").toLowerCase();
	return `${PRIVATE_KEY_PREFIX}${path}.${normalizedExt}`;
}

export function buildDevUploadKey(userId: string, contentType: ImageMimeType, id: string): string {
	const ext = IMAGE_EXTENSION_BY_MIME[contentType];
	return `${DEV_UPLOAD_KEY_PREFIX}${sanitizeSegment(userId)}/${sanitizeSegment(id)}.${ext}`;
}

export function isPublicKey(key: string): boolean {
	return key.startsWith(PUBLIC_KEY_PREFIX);
}

export function isPrivateKey(key: string): boolean {
	return key.startsWith(PRIVATE_KEY_PREFIX);
}

export function isDevUploadKeyForUser(key: string, userId: string): boolean {
	const prefix = `${DEV_UPLOAD_KEY_PREFIX}${sanitizeSegment(userId)}/`;
	return key.startsWith(prefix);
}

export function buildUserAvatarKey(userId: string, contentType: ImageMimeType, id: string): string {
	const ext = IMAGE_EXTENSION_BY_MIME[contentType];
	return buildPublicKey(["avatars", "users", userId, id], ext);
}

export function buildClubAvatarKey(clubId: string, contentType: ImageMimeType, id: string): string {
	const ext = IMAGE_EXTENSION_BY_MIME[contentType];
	return buildPublicKey(["clubs", clubId, "avatar", id], ext);
}

export function buildClubCoverKey(clubId: string, contentType: ImageMimeType, id: string): string {
	const ext = IMAGE_EXTENSION_BY_MIME[contentType];
	return buildPublicKey(["clubs", clubId, "cover", id], ext);
}

export function isUserAvatarKeyForUser(key: string, userId: string): boolean {
	const prefix = `${PUBLIC_KEY_PREFIX}avatars/users/${sanitizeSegment(userId)}/`;
	return key.startsWith(prefix);
}

export function isClubAvatarKeyForClub(key: string, clubId: string): boolean {
	const prefix = `${PUBLIC_KEY_PREFIX}clubs/${sanitizeSegment(clubId)}/avatar/`;
	return key.startsWith(prefix);
}

export function isClubCoverKeyForClub(key: string, clubId: string): boolean {
	const prefix = `${PUBLIC_KEY_PREFIX}clubs/${sanitizeSegment(clubId)}/cover/`;
	return key.startsWith(prefix);
}
