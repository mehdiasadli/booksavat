import type { Metadata } from "next";

import { redirectIfAuthenticated } from "@/lib/auth-functions";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
	title: {
		default: "Account",
		template: `%s | ${APP_NAME}`,
	},
	robots: {
		index: false,
		follow: false,
		googleBot: {
			index: false,
			follow: false,
		},
	},
};

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
	await redirectIfAuthenticated();

	return <div>{children}</div>;
}
