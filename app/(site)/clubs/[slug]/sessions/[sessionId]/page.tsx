import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { ClubSessionDetail } from "@/components/clubs/club-session-detail";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { getClubPageData } from "@/lib/clubs/queries.server";
import { getReadingSession } from "@/lib/clubs/session.server";
import { buildMetadata } from "@/lib/seo";

interface ClubSessionPageProps {
	params: Promise<{ slug: string; sessionId: string }>;
}

async function viewerUserId(): Promise<string | null> {
	const session = await auth.api.getSession({ headers: await headers() });
	return session?.user?.id ?? null;
}

export async function generateMetadata({ params }: ClubSessionPageProps): Promise<Metadata> {
	const { slug, sessionId } = await params;
	const clubResult = await getClubPageData(slug);
	if (!clubResult.ok) {
		return { title: "Session not found", robots: { index: false, follow: false } };
	}

	const sessionResult = await getReadingSession(db, slug, sessionId, await viewerUserId());
	if (!sessionResult.ok) {
		return { title: "Session not found", robots: { index: false, follow: false } };
	}

	return buildMetadata({
		title: `${sessionResult.data.title?.trim() || "Session"} · ${clubResult.data.name}`,
		description: `Reading session for ${clubResult.data.name}`,
		path: `/clubs/${slug}/sessions/${sessionId}`,
		noIndex: true,
	});
}

export default async function ClubSessionPage({ params }: ClubSessionPageProps) {
	const { slug, sessionId } = await params;
	const clubResult = await getClubPageData(slug);
	if (!clubResult.ok) {
		notFound();
	}

	const sessionResult = await getReadingSession(db, slug, sessionId, await viewerUserId());
	if (!sessionResult.ok) {
		notFound();
	}

	return <ClubSessionDetail club={clubResult.data} initial={sessionResult.data} />;
}
