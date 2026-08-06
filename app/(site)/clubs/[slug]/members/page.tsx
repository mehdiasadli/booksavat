import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClubMembers } from "@/components/clubs/club-members";
import { getClubPageData } from "@/lib/clubs/queries.server";
import { buildMetadata } from "@/lib/seo";

interface ClubMembersPageProps {
	params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ClubMembersPageProps): Promise<Metadata> {
	const { slug } = await params;
	const result = await getClubPageData(slug);

	if (!result.ok) {
		return { title: "Club not found", robots: { index: false, follow: false } };
	}

	return buildMetadata({
		title: `Members · ${result.data.name}`,
		description: `Members of ${result.data.name}`,
		path: `/clubs/${result.data.slug}/members`,
		noIndex: true,
	});
}

export default async function ClubMembersPage({ params }: ClubMembersPageProps) {
	const { slug } = await params;
	const result = await getClubPageData(slug);

	if (!result.ok) {
		notFound();
	}

	return <ClubMembers initial={result.data} />;
}
