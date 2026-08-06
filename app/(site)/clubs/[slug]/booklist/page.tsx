import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClubBooklist } from "@/components/clubs/club-booklist";
import { getClubPageData } from "@/lib/clubs/queries.server";
import { buildMetadata } from "@/lib/seo";

interface ClubBooklistPageProps {
	params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ClubBooklistPageProps): Promise<Metadata> {
	const { slug } = await params;
	const result = await getClubPageData(slug);

	if (!result.ok) {
		return { title: "Club not found", robots: { index: false, follow: false } };
	}

	return buildMetadata({
		title: `Booklist · ${result.data.name}`,
		description: `Booklist for ${result.data.name}`,
		path: `/clubs/${result.data.slug}/booklist`,
		noIndex: result.data.visibility !== "public",
	});
}

export default async function ClubBooklistPage({ params }: ClubBooklistPageProps) {
	const { slug } = await params;
	const result = await getClubPageData(slug);

	if (!result.ok) {
		notFound();
	}

	return <ClubBooklist initial={result.data} />;
}
