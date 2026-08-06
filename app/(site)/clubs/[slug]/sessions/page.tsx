import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClubSessions } from "@/components/clubs/club-sessions";
import { getClubPageData } from "@/lib/clubs/queries.server";
import { buildMetadata } from "@/lib/seo";

interface ClubSessionsPageProps {
	params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ClubSessionsPageProps): Promise<Metadata> {
	const { slug } = await params;
	const result = await getClubPageData(slug);

	if (!result.ok) {
		return { title: "Club not found", robots: { index: false, follow: false } };
	}

	return buildMetadata({
		title: `Sessions · ${result.data.name}`,
		description: `Reading sessions for ${result.data.name}`,
		path: `/clubs/${result.data.slug}/sessions`,
		noIndex: result.data.visibility !== "public",
	});
}

export default async function ClubSessionsPage({ params }: ClubSessionsPageProps) {
	const { slug } = await params;
	const result = await getClubPageData(slug);

	if (!result.ok) {
		notFound();
	}

	return <ClubSessions initial={result.data} />;
}
