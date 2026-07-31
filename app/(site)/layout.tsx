import type { Metadata } from "next";

import { APP_NAME } from "@/lib/constants";
import { APP_DESCRIPTION, buildMetadata } from "@/lib/seo";

export const metadata: Metadata = {
	...buildMetadata({
		description: APP_DESCRIPTION,
		path: "/",
		noIndex: true,
	}),
	title: {
		default: APP_NAME,
		template: `%s | ${APP_NAME}`,
	},
};

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
	return <div>{children}</div>;
}
