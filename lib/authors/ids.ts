import { authorIdSchema } from "@/olib/ids";

/** Strip `/authors/` prefix without validating. */
export function normalizeAuthorKey(key: string): string {
	return key.replace(/^\/?authors\//i, "").toUpperCase();
}

/** Normalize and validate an author OLID. Throws on invalid input. */
export function toAuthorId(key: string): string {
	return authorIdSchema.parse(key);
}

export function tryAuthorId(key: string): string | null {
	const parsed = authorIdSchema.safeParse(key);
	return parsed.success ? parsed.data : null;
}

export function authorOpenLibraryUrl(authorId: string): string {
	return `https://openlibrary.org/authors/${normalizeAuthorKey(authorId)}`;
}
