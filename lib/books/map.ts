import { coverUrlFromCoverId, coverUrlFromEditionId, coverUrlFromIsbn } from "@/lib/books/covers";
import {
	editionOpenLibraryUrl,
	normalizeEditionKey,
	normalizeWorkKey,
	workOpenLibraryUrl,
} from "@/lib/books/ids";
import { type Edition, type SearchWorkDoc, unwrapTextValue, type Work } from "@/olib";
import type {
	BookAuthorRef,
	BookEditionDetail,
	BookEditionSummary,
	BookSearchItem,
	BookWorkDetail,
} from "@/server/contracts/book.contract";

function firstSentence(value: unknown): string | null {
	if (typeof value === "string" && value.trim()) {
		return value.trim();
	}

	if (Array.isArray(value)) {
		const first = value.find((item) => typeof item === "string" && item.trim());
		return typeof first === "string" ? first.trim() : null;
	}

	return null;
}

function languageLabel(key: string | undefined): string | null {
	if (!key) {
		return null;
	}

	const code = key.replace(/^\/?languages\//, "");
	return code || null;
}

export function mapSearchWorkDoc(doc: SearchWorkDoc): BookSearchItem {
	const workId = normalizeWorkKey(doc.key);
	const isbns = doc.isbn?.slice(0, 5) ?? [];
	const coverUrl = coverUrlFromCoverId(doc.cover_i, "M") ?? coverUrlFromIsbn(isbns[0], "M") ?? null;

	return {
		workId,
		title: doc.title?.trim() || "Untitled",
		subtitle: doc.subtitle?.trim() || null,
		authors: doc.author_name ?? [],
		coverUrl,
		firstPublishYear: doc.first_publish_year ?? null,
		subjects: (doc.subject ?? []).slice(0, 6),
		isbns,
		editionCount: doc.edition_count ?? null,
		excerpt: firstSentence((doc as { first_sentence?: unknown }).first_sentence),
	};
}

export function mapWorkDetail(
	work: Work,
	options: { authors?: BookAuthorRef[]; editionCount?: number | null } = {},
): BookWorkDetail {
	const workId = normalizeWorkKey(work.key);
	const coverUrl = coverUrlFromCoverId(work.covers?.[0], "L");

	return {
		workId,
		title: work.title?.trim() || "Untitled",
		subtitle: work.subtitle?.trim() || null,
		description: unwrapTextValue(work.description)?.trim() || null,
		coverUrl,
		authors: options.authors ?? [],
		subjects: work.subjects ?? [],
		subjectPlaces: work.subject_places ?? [],
		subjectTimes: work.subject_times ?? [],
		subjectPeople: work.subject_people ?? [],
		firstPublishDate: work.first_publish_date ?? null,
		editionCount: options.editionCount ?? null,
		openLibraryUrl: workOpenLibraryUrl(workId),
	};
}

export function mapEditionSummary(edition: Edition): BookEditionSummary {
	const editionId = normalizeEditionKey(edition.key);
	const isbn13 = edition.isbn_13 ?? [];
	const isbn10 = edition.isbn_10 ?? [];
	const coverUrl =
		coverUrlFromCoverId(edition.covers?.[0], "M") ??
		coverUrlFromEditionId(editionId, "M") ??
		coverUrlFromIsbn(isbn13[0] ?? isbn10[0], "M");

	return {
		editionId,
		title: edition.title?.trim() || "Untitled",
		subtitle: edition.subtitle?.trim() || null,
		coverUrl,
		publishDate: edition.publish_date ?? null,
		publishers: edition.publishers ?? [],
		isbn10,
		isbn13,
		pageCount: edition.number_of_pages ?? null,
		languages: (edition.languages ?? [])
			.map((language) => languageLabel(language.key))
			.filter((value): value is string => Boolean(value)),
	};
}

export function mapEditionDetail(
	edition: Edition,
	options: { workTitle?: string | null } = {},
): BookEditionDetail {
	const summary = mapEditionSummary(edition);
	const workKey = edition.works?.[0]?.key;

	return {
		...summary,
		description: unwrapTextValue(edition.description)?.trim() || null,
		physicalFormat: edition.physical_format ?? null,
		pagination: edition.pagination ?? null,
		weight: edition.weight ?? null,
		publishPlaces: edition.publish_places ?? [],
		workId: workKey ? normalizeWorkKey(workKey) : null,
		workTitle: options.workTitle ?? null,
		openLibraryUrl: editionOpenLibraryUrl(summary.editionId),
	};
}
