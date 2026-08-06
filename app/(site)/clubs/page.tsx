import type { Metadata } from "next";

import { ClubsPage } from "@/components/clubs/clubs-page";
import { APP_NAME } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
	title: "Clubs",
	description: `Browse and create reading clubs on ${APP_NAME}.`,
	path: "/clubs",
});

export default function Page() {
	return <ClubsPage />;
}
