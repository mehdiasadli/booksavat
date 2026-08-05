import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DiaryList } from "@/components/reading-logs/diary-list";
import { getCurrentSession } from "@/lib/auth-functions";
import { APP_NAME } from "@/lib/constants";
import { getDiaryPageData } from "@/lib/reading-logs/queries.server";
import { buildMetadata } from "@/lib/seo";

interface DiaryPageProps {
	params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: DiaryPageProps): Promise<Metadata> {
	const { username } = await params;
	const session = await getCurrentSession();

	if (!session?.user?.username || session.user.username !== username) {
		return {
			title: "Diary",
			robots: { index: false, follow: false },
		};
	}

	return buildMetadata({
		title: "Reading diary",
		description: `Your reading diary on ${APP_NAME}.`,
		path: `/users/${username}/diary`,
		noIndex: true,
	});
}

export default async function DiaryPage({ params }: DiaryPageProps) {
	const { username } = await params;
	const data = await getDiaryPageData(username);

	if (!data) {
		notFound();
	}

	return <DiaryList username={data.ownerUsername} items={data.items} />;
}
