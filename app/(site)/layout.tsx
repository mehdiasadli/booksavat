import type { Metadata } from "next";

import { SiteShell } from "@/components/layout/site-shell";
import { APP_NAME } from "@/lib/constants";
import { APP_DESCRIPTION, buildMetadata } from "@/lib/seo";

export const metadata: Metadata = {
	...buildMetadata({
		description: APP_DESCRIPTION,
		path: "/",
	}),
	title: {
		default: APP_NAME,
		template: `%s | ${APP_NAME}`,
	},
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
	return <SiteShell>{children}</SiteShell>;
}
