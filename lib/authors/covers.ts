import { normalizeAuthorKey } from "@/lib/authors/ids";
import { olib } from "@/olib";

export function photoUrlFromPhotoId(
	photoId: number | undefined | null,
	size: "S" | "M" | "L" = "M",
): string | null {
	if (photoId == null) {
		return null;
	}

	return olib.covers.authorUrl({
		key: "id",
		value: photoId,
		size,
		defaultImage: false,
	});
}

export function photoUrlFromAuthorId(
	authorId: string | undefined | null,
	size: "S" | "M" | "L" = "M",
): string | null {
	if (!authorId) {
		return null;
	}

	return olib.covers.authorUrl({
		key: "olid",
		value: normalizeAuthorKey(authorId),
		size,
		defaultImage: false,
	});
}

export function authorPhotoUrl(
	authorId: string,
	photos: number[] | undefined | null,
	size: "S" | "M" | "L" = "M",
): string | null {
	return photoUrlFromPhotoId(photos?.[0], size) ?? photoUrlFromAuthorId(authorId, size);
}
