import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClubProfile } from "@/components/clubs/club-profile";
import { getClubPageData } from "@/lib/clubs/queries.server";
import { APP_NAME } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";

interface ClubAboutPageProps {
	params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ClubAboutPageProps): Promise<Metadata> {
	const { slug } = await params;
	const result = await getClubPageData(slug);

	if (!result.ok) {
		return {
			title: "Club not found",
			robots: { index: false, follow: false },
		};
	}

	return buildMetadata({
		title: `${result.data.name} · About`,
		description: result.data.description ?? `${result.data.name} on ${APP_NAME}`,
		path: `/clubs/${result.data.slug}/about`,
		noIndex: result.data.visibility === "invite_only",
	});
}

export default async function ClubAboutPage({ params }: ClubAboutPageProps) {
	const { slug } = await params;
	const result = await getClubPageData(slug);

	if (!result.ok) {
		notFound();
	}

	return <ClubProfile initial={result.data} />;
}
