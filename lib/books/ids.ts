import { editionIdSchema, workIdSchema } from "@/olib/ids";

/** Strip `/works/` prefix without validating. */
export function normalizeWorkKey(key: string): string {
	return key.replace(/^\/?works\//i, "").toUpperCase();
}

/** Strip `/books/` prefix without validating. */
export function normalizeEditionKey(key: string): string {
	return key.replace(/^\/?books\//i, "").toUpperCase();
}

/** Normalize and validate a work OLID. Throws on invalid input. */
export function toWorkId(key: string): string {
	return workIdSchema.parse(key);
}

/** Normalize and validate an edition OLID. Throws on invalid input. */
export function toEditionId(key: string): string {
	return editionIdSchema.parse(key);
}

export function tryWorkId(key: string): string | null {
	const parsed = workIdSchema.safeParse(key);
	return parsed.success ? parsed.data : null;
}

export function tryEditionId(key: string): string | null {
	const parsed = editionIdSchema.safeParse(key);
	return parsed.success ? parsed.data : null;
}

export function workOpenLibraryUrl(workId: string): string {
	return `https://openlibrary.org/works/${normalizeWorkKey(workId)}`;
}

export function editionOpenLibraryUrl(editionId: string): string {
	return `https://openlibrary.org/books/${normalizeEditionKey(editionId)}`;
}
