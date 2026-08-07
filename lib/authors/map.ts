import { authorPhotoUrl } from "@/lib/authors/covers";
import { authorOpenLibraryUrl, normalizeAuthorKey, tryAuthorId } from "@/lib/authors/ids";
import { coverUrlFromCoverId } from "@/lib/books/covers";
import { normalizeWorkKey } from "@/lib/books/ids";
import { type Author, type SearchAuthorDoc, unwrapTextValue, type Work } from "@/olib";
import type {
	AuthorDetail,
	AuthorSearchItem,
	AuthorWorkSummary,
} from "@/server/contracts/author.contract";

export function mapSearchAuthorDoc(doc: SearchAuthorDoc): AuthorSearchItem | null {
	const authorId = tryAuthorId(doc.key);
	if (!authorId) {
		return null;
	}

	return {
		authorId,
		name: doc.name?.trim() || authorId,
		birthDate: doc.birth_date?.trim() || null,
		deathDate: doc.death_date?.trim() || null,
		topWork: doc.top_work?.trim() || null,
		workCount: doc.work_count ?? null,
		photoUrl: authorPhotoUrl(authorId, null, "M"),
	};
}

export function mapAuthorDetail(author: Author): AuthorDetail {
	const authorId = normalizeAuthorKey(author.key);

	return {
		authorId,
		name: author.name?.trim() || author.personal_name?.trim() || authorId,
		bio: unwrapTextValue(author.bio)?.trim() || null,
		birthDate: author.birth_date?.trim() || null,
		deathDate: author.death_date?.trim() || null,
		alternateNames: author.alternate_names ?? [],
		wikipedia: author.wikipedia?.trim() || null,
		photoUrl: authorPhotoUrl(authorId, author.photos, "L"),
		openLibraryUrl: authorOpenLibraryUrl(authorId),
	};
}

export function mapAuthorWorkSummary(work: Work): AuthorWorkSummary | null {
	const workId = tryWorkKey(work.key);
	if (!workId) {
		return null;
	}

	return {
		workId,
		title: work.title?.trim() || "Untitled",
		coverUrl: coverUrlFromCoverId(work.covers?.[0], "M"),
		firstPublishDate: work.first_publish_date?.trim() || null,
	};
}

function tryWorkKey(key: string): string | null {
	try {
		const workId = normalizeWorkKey(key);
		return /^OL\d+W$/i.test(workId) ? workId : null;
	} catch {
		return null;
	}
}
