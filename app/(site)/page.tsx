import type { Metadata } from "next";

import { HomePage } from "@/app/(site)/home-page";
import { APP_NAME } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
	title: "Home",
	description: `Your ${APP_NAME} home — shelves, friends, clubs, and reading sessions.`,
	path: "/",
	noIndex: true,
});

export default function Page() {
	return <HomePage />;
}
