import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EditionDetail } from "@/components/books/edition-detail";
import { tryEditionId } from "@/lib/books/ids";
import { getBookEdition } from "@/lib/books/queries.server";
import { APP_NAME } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";

interface EditionPageProps {
	params: Promise<{ editionId: string }>;
}

export async function generateMetadata({ params }: EditionPageProps): Promise<Metadata> {
	const { editionId: rawEditionId } = await params;
	const editionId = tryEditionId(rawEditionId);

	if (!editionId) {
		return {
			title: "Edition not found",
			robots: { index: false, follow: false },
		};
	}

	const edition = await getBookEdition(editionId);

	if (!edition) {
		return {
			title: "Edition not found",
			robots: { index: false, follow: false },
		};
	}

	const description =
		edition.description?.slice(0, 160) ||
		`${edition.title}${edition.publishDate ? ` (${edition.publishDate})` : ""} on ${APP_NAME}.`;

	return buildMetadata({
		title: edition.title,
		description,
		path: `/books/edition/${edition.editionId}`,
		image: edition.coverUrl ?? undefined,
	});
}

export default async function EditionPage({ params }: EditionPageProps) {
	const { editionId: rawEditionId } = await params;
	const editionId = tryEditionId(rawEditionId);

	if (!editionId) {
		notFound();
	}

	const edition = await getBookEdition(editionId);

	if (!edition) {
		notFound();
	}

	return <EditionDetail edition={edition} />;
}
