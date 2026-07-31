import { z } from "zod";

import { OpenLibraryError } from "./errors";

/** Work OLID, with or without `/works/` prefix — e.g. `OL45804W` or `/works/OL45804W`. */
export const workIdSchema = z
	.string()
	.trim()
	.min(1)
	.transform((value) => value.replace(/^\/?works\//, "").toUpperCase())
	.refine((value) => /^OL\d+W$/i.test(value), {
		message: "Expected a work OLID like OL45804W",
	});

/** Edition/book OLID — e.g. `OL44247403M` or `/books/OL44247403M`. */
export const editionIdSchema = z
	.string()
	.trim()
	.min(1)
	.transform((value) => value.replace(/^\/?books\//, "").toUpperCase())
	.refine((value) => /^OL\d+M$/i.test(value), {
		message: "Expected an edition OLID like OL44247403M",
	});

/** Author OLID — e.g. `OL26320A` or `/authors/OL26320A`. */
export const authorIdSchema = z
	.string()
	.trim()
	.min(1)
	.transform((value) => value.replace(/^\/?authors\//, "").toUpperCase())
	.refine((value) => /^OL\d+A$/i.test(value), {
		message: "Expected an author OLID like OL26320A",
	});

/** ISBN-10 or ISBN-13 (hyphens/spaces allowed; normalized to digits + optional trailing X). */
export const isbnSchema = z
	.string()
	.trim()
	.min(1)
	.transform((value) => value.replace(/[-\s]/g, "").toUpperCase())
	.refine((value) => /^(?:\d{9}[\dX]|\d{13})$/.test(value), {
		message: "Expected a valid ISBN-10 or ISBN-13",
	});

export function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown, label: string): T {
	const parsed = schema.safeParse(value);

	if (!parsed.success) {
		throw new OpenLibraryError("INVALID_INPUT", `Invalid ${label}`, {
			issues: parsed.error.issues,
		});
	}

	return parsed.data;
}

export function workPath(id: string): string {
	return `/works/${id}`;
}

export function editionPath(id: string): string {
	return `/books/${id}`;
}

export function authorPath(id: string): string {
	return `/authors/${id}`;
}
