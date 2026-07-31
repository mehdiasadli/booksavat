import type { Metadata } from "next";

import LoginBlock from "@/app/(auth)/login/login-block";
import { APP_NAME } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
	title: "Sign in",
	description: `Sign in to your ${APP_NAME} account with Google to continue reading with friends.`,
	path: "/login",
	noIndex: true,
});

export default function LoginPage() {
	return (
		<div className="flex h-screen w-screen items-center justify-center">
			<LoginBlock />
		</div>
	);
}
