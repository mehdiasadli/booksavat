import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ShelvesList } from "@/components/shelves/shelves-list";
import { getCurrentSession } from "@/lib/auth-functions";
import { APP_NAME } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";
import { getShelvesPageData } from "@/lib/shelves/queries.server";

interface ShelvesPageProps {
	params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ShelvesPageProps): Promise<Metadata> {
	const { username } = await params;
	const data = await getShelvesPageData(username);

	if (!data) {
		return {
			title: "Shelves not found",
			robots: { index: false, follow: false },
		};
	}

	return buildMetadata({
		title: `${data.ownerUsername}’s shelves`,
		description: `Browse shelves from @${data.ownerUsername} on ${APP_NAME}.`,
		path: `/users/${data.ownerUsername}/shelves`,
	});
}

export default async function ShelvesPage({ params }: ShelvesPageProps) {
	const { username } = await params;
	const data = await getShelvesPageData(username);

	if (!data) {
		notFound();
	}

	const session = await getCurrentSession();
	const isOwner = session?.user?.username === data.ownerUsername;

	return (
		<ShelvesList username={data.ownerUsername} shelves={data.shelves} isOwner={Boolean(isOwner)} />
	);
}
