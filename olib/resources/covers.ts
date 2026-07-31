import { parseOrThrow } from "../ids";
import {
	type AuthorCoverInput,
	authorCoverInputSchema,
	type BookCoverInput,
	bookCoverInputSchema,
} from "../schemas/covers";

const COVERS_BASE_URL = "https://covers.openlibrary.org";

function buildCoverUrl(
	kind: "b" | "a",
	key: string,
	value: string | number,
	size: string,
	defaultImage: boolean,
): string {
	const url = new URL(`${COVERS_BASE_URL}/${kind}/${key}/${value}-${size}.jpg`);

	if (!defaultImage) {
		url.searchParams.set("default", "false");
	}

	return url.toString();
}

export function createCoversResource() {
	return {
		/**
		 * Build a book cover image URL (no network call).
		 * @see https://openlibrary.org/dev/docs/api/covers
		 */
		bookUrl: (input: BookCoverInput): string => {
			const parsed = parseOrThrow(bookCoverInputSchema, input, "covers.bookUrl input");

			return buildCoverUrl("b", parsed.key, parsed.value, parsed.size, parsed.defaultImage);
		},

		/**
		 * Build an author photo URL (no network call).
		 * @see https://openlibrary.org/dev/docs/api/covers
		 */
		authorUrl: (input: AuthorCoverInput): string => {
			const parsed = parseOrThrow(authorCoverInputSchema, input, "covers.authorUrl input");

			return buildCoverUrl("a", parsed.key, parsed.value, parsed.size, parsed.defaultImage);
		},
	};
}

export type CoversResource = ReturnType<typeof createCoversResource>;
