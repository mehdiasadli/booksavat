import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WorkDetail } from "@/components/books/work-detail";
import { listAuthorWorksCached } from "@/lib/authors/queries.server";
import { tryWorkId } from "@/lib/books/ids";
import { getBookWork, listBookEditions } from "@/lib/books/queries.server";
import { APP_NAME } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";

interface WorkPageProps {
	params: Promise<{ workId: string }>;
}

export async function generateMetadata({ params }: WorkPageProps): Promise<Metadata> {
	const { workId: rawWorkId } = await params;
	const workId = tryWorkId(rawWorkId);

	if (!workId) {
		return {
			title: "Book not found",
			robots: { index: false, follow: false },
		};
	}

	const work = await getBookWork(workId);

	if (!work) {
		return {
			title: "Book not found",
			robots: { index: false, follow: false },
		};
	}

	const authorName = work.authors[0]?.name;
	const description =
		work.description?.slice(0, 160) ||
		`Explore ${work.title}${authorName ? ` by ${authorName}` : ""} on ${APP_NAME}.`;

	return buildMetadata({
		title: work.title,
		description,
		path: `/books/${work.workId}`,
		image: work.coverUrl ?? undefined,
	});
}

export default async function WorkPage({ params }: WorkPageProps) {
	const { workId: rawWorkId } = await params;
	const workId = tryWorkId(rawWorkId);

	if (!workId) {
		notFound();
	}

	const [work, editions] = await Promise.all([getBookWork(workId), listBookEditions(workId, 12)]);

	if (!work) {
		notFound();
	}

	const primaryAuthor = work.authors[0];
	const related = primaryAuthor ? await listAuthorWorksCached(primaryAuthor.authorId, 12) : null;
	const otherWorks =
		primaryAuthor && related
			? {
					authorId: primaryAuthor.authorId,
					authorName: primaryAuthor.name,
					works: related.items.filter((item) => item.workId !== work.workId).slice(0, 8),
				}
			: null;

	return (
		<WorkDetail
			work={work}
			editions={editions.items}
			editionTotal={editions.total}
			editionNextOffset={editions.nextOffset}
			otherWorks={otherWorks && otherWorks.works.length > 0 ? otherWorks : null}
		/>
	);
}
