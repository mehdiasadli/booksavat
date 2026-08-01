import { normalizeEditionKey } from "@/lib/books/ids";
import { olib } from "@/olib";

export function coverUrlFromCoverId(
	coverId: number | undefined | null,
	size: "S" | "M" | "L" = "M",
): string | null {
	if (coverId == null) {
		return null;
	}

	return olib.covers.bookUrl({
		key: "id",
		value: coverId,
		size,
		defaultImage: false,
	});
}

export function coverUrlFromEditionId(
	editionId: string | undefined | null,
	size: "S" | "M" | "L" = "M",
): string | null {
	if (!editionId) {
		return null;
	}

	return olib.covers.bookUrl({
		key: "olid",
		value: normalizeEditionKey(editionId),
		size,
		defaultImage: false,
	});
}

export function coverUrlFromIsbn(
	isbn: string | undefined | null,
	size: "S" | "M" | "L" = "M",
): string | null {
	if (!isbn) {
		return null;
	}

	return olib.covers.bookUrl({
		key: "isbn",
		value: isbn,
		size,
		defaultImage: false,
	});
}
