/** Shared MIME / size limits for R2 uploads (images + PDFs). */

export const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"] as const;

export type ImageMimeType = (typeof IMAGE_MIME_TYPES)[number];

export const IMAGE_EXTENSION_BY_MIME: Record<ImageMimeType, string> = {
	"image/png": "png",
	"image/jpeg": "jpg",
	"image/jpg": "jpg",
	"image/webp": "webp",
};

export const PDF_MIME_TYPE = "application/pdf" as const;

/** Max upload sizes (bytes). */
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
export const MAX_CLUB_COVER_BYTES = 5 * 1024 * 1024;
export const MAX_POST_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_DEV_PING_BYTES = MAX_AVATAR_BYTES;
export const MAX_PDF_BYTES = 100 * 1024 * 1024;

export const MAX_BOOKLIST_PDFS_PER_ITEM = 3;

export const PUBLIC_KEY_PREFIX = "public/";
export const PRIVATE_KEY_PREFIX = "private/";
export const DEV_UPLOAD_KEY_PREFIX = "public/dev/";

export function isImageMimeType(value: string): value is ImageMimeType {
	return (IMAGE_MIME_TYPES as readonly string[]).includes(value);
}

export const imageUploadPurposeSchema = ["user_avatar", "club_avatar", "club_cover"] as const;
export type ImageUploadPurpose = (typeof imageUploadPurposeSchema)[number];
