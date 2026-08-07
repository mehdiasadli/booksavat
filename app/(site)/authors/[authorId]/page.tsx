import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AuthorDetail } from "@/components/authors/author-detail";
import { tryAuthorId } from "@/lib/authors/ids";
import { getAuthor, listAuthorWorksCached } from "@/lib/authors/queries.server";
import { APP_NAME } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";

interface AuthorPageProps {
	params: Promise<{ authorId: string }>;
}

export async function generateMetadata({ params }: AuthorPageProps): Promise<Metadata> {
	const { authorId: rawAuthorId } = await params;
	const authorId = tryAuthorId(rawAuthorId);

	if (!authorId) {
		return {
			title: "Author not found",
			robots: { index: false, follow: false },
		};
	}

	const author = await getAuthor(authorId);

	if (!author) {
		return {
			title: "Author not found",
			robots: { index: false, follow: false },
		};
	}

	const description =
		author.bio?.slice(0, 160) || `Explore works by ${author.name} on ${APP_NAME}.`;

	return buildMetadata({
		title: author.name,
		description,
		path: `/authors/${author.authorId}`,
		image: author.photoUrl ?? undefined,
	});
}

export default async function AuthorPage({ params }: AuthorPageProps) {
	const { authorId: rawAuthorId } = await params;
	const authorId = tryAuthorId(rawAuthorId);

	if (!authorId) {
		notFound();
	}

	const [author, works] = await Promise.all([
		getAuthor(authorId),
		listAuthorWorksCached(authorId, 24),
	]);

	if (!author) {
		notFound();
	}

	return (
		<AuthorDetail
			author={author}
			works={works.items}
			workTotal={works.total}
			workNextOffset={works.nextOffset}
		/>
	);
}
