import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PrivateLocked } from "@/components/follows/private-locked";
import { DiaryList } from "@/components/reading-logs/diary-list";
import { APP_NAME } from "@/lib/constants";
import { getDiaryPageData } from "@/lib/reading-logs/queries.server";
import { buildMetadata } from "@/lib/seo";

interface DiaryPageProps {
	params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: DiaryPageProps): Promise<Metadata> {
	const { username } = await params;
	const data = await getDiaryPageData(username);

	if (!data || data.locked) {
		return {
			title: "Diary",
			robots: { index: false, follow: false },
		};
	}

	return buildMetadata({
		title: `@${data.ownerUsername}’s diary`,
		description: `Reading diary for @${data.ownerUsername} on ${APP_NAME}.`,
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

	if (data.locked) {
		return (
			<div className="mx-auto max-w-2xl px-6 py-12">
				<PrivateLocked username={data.ownerUsername} />
			</div>
		);
	}

	return <DiaryList username={data.ownerUsername} items={data.items} />;
}
