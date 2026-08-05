import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PeoplePage } from "@/components/follows/people-page";
import { getCurrentSession } from "@/lib/auth-functions";
import { APP_NAME } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
	title: "People",
	description: `Manage follows and privacy on ${APP_NAME}.`,
	path: "/people",
	noIndex: true,
});

export default async function Page() {
	const session = await getCurrentSession();
	if (!session?.user) {
		redirect("/login");
	}

	return <PeoplePage />;
}
