import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ClubSettings } from "@/components/clubs/club-settings";
import { getClubPageData } from "@/lib/clubs/queries.server";
import { buildMetadata } from "@/lib/seo";

interface ClubSettingsPageProps {
	params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ClubSettingsPageProps): Promise<Metadata> {
	const { slug } = await params;
	const result = await getClubPageData(slug);

	if (!result.ok) {
		return { title: "Club not found", robots: { index: false, follow: false } };
	}

	return buildMetadata({
		title: `Settings · ${result.data.name}`,
		description: `Settings for ${result.data.name}`,
		path: `/clubs/${result.data.slug}/settings`,
		noIndex: true,
	});
}

export default async function ClubSettingsPage({ params }: ClubSettingsPageProps) {
	const { slug } = await params;
	const result = await getClubPageData(slug);

	if (!result.ok) {
		notFound();
	}

	if (!result.data.canManageSettings) {
		redirect(`/clubs/${result.data.slug}`);
	}

	return <ClubSettings initial={result.data} />;
}
