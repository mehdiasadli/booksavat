import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ShelfDetail } from "@/components/shelves/shelf-detail";
import { getCurrentSession } from "@/lib/auth-functions";
import { APP_NAME } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";
import { getShelfPageData } from "@/lib/shelves/queries.server";

interface ShelfPageProps {
	params: Promise<{ username: string; slug: string }>;
}

export async function generateMetadata({ params }: ShelfPageProps): Promise<Metadata> {
	const { username, slug } = await params;
	const data = await getShelfPageData(username, slug);

	if (!data) {
		return {
			title: "Shelf not found",
			robots: { index: false, follow: false },
		};
	}

	const noIndex = data.shelf.visibility !== "public";

	return buildMetadata({
		title: `${data.shelf.name} · @${data.ownerUsername}`,
		description:
			data.shelf.description ||
			`${data.shelf.name} shelf by @${data.ownerUsername} on ${APP_NAME}.`,
		path: `/users/${data.ownerUsername}/shelves/${data.shelf.slug}`,
		noIndex,
	});
}

export default async function ShelfPage({ params }: ShelfPageProps) {
	const { username, slug } = await params;
	const data = await getShelfPageData(username, slug);

	if (!data) {
		notFound();
	}

	const session = await getCurrentSession();
	const isOwner = session?.user?.username === data.ownerUsername;

	return (
		<ShelfDetail
			username={data.ownerUsername}
			shelf={data.shelf}
			items={data.items}
			total={data.total}
			isOwner={Boolean(isOwner)}
		/>
	);
}
