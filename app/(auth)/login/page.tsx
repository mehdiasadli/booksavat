import type { Metadata } from "next";

import LoginBlock from "@/app/(auth)/login/login-block";

const TITLE = "Login";
const DESCRIPTION = "Login to your BookSavat account";

export const metadata: Metadata = {
	title: TITLE,
	description: DESCRIPTION,
	openGraph: {
		title: TITLE,
		description: DESCRIPTION,
	},
};

export default function LoginPage() {
	return (
		<div className="flex h-screen w-screen items-center justify-center">
			<LoginBlock />
		</div>
	);
}
