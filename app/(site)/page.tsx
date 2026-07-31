"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export default function HomePage() {
	async function logout() {
		await authClient.signOut();
	}

	return (
		<div>
			<Button onClick={logout}>Logout</Button>
		</div>
	);
}
