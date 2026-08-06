import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { ClubPostDetailView } from "@/components/clubs/club-post-detail";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { getCommunityPost } from "@/lib/clubs/community.server";
import { getClubPageData } from "@/lib/clubs/queries.server";
import { buildMetadata } from "@/lib/seo";

interface ClubPostPageProps {
	params: Promise<{ slug: string; postSlug: string }>;
}

export async function generateMetadata({ params }: ClubPostPageProps): Promise<Metadata> {
	const { slug, postSlug } = await params;
	const session = await auth.api.getSession({ headers: await headers() });
	const result = await getCommunityPost(db, slug, postSlug, session?.user?.id);

	if (!result.ok) {
		return {
			title: "Post not found",
			robots: { index: false, follow: false },
		};
	}

	return buildMetadata({
		title: result.data.title,
		description: result.data.title,
		path: `/clubs/${slug}/posts/${postSlug}`,
		noIndex: true,
	});
}

export default async function ClubPostPage({ params }: ClubPostPageProps) {
	const { slug, postSlug } = await params;
	const clubResult = await getClubPageData(slug);
	if (!clubResult.ok) {
		notFound();
	}

	return <ClubPostDetailView club={clubResult.data} postSlug={postSlug} />;
}
