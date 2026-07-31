import type { Metadata } from "next";

import { redirectIfNotAuthenticated } from "@/lib/auth-functions";

export const metadata: Metadata = {
	description:
		"BookSavat is a platform for managing your books, and be a part of reading sessions with your friends.",
};

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
	await redirectIfNotAuthenticated();

	return <div>{children}</div>;
}
