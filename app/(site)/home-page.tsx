"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function HomePage() {
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const { data: session, isPending } = authClient.useSession();
	const router = useRouter();

	async function logout() {
		if (!session) return;

		try {
			const { error } = await authClient.signOut();

			if (error) {
				throw new Error(error.message);
			}

			router.push("/login");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to logout");
		} finally {
			setIsLoggingOut(false);
		}
	}

	return (
		<div>
			{isPending ? (
				<Loader2 className="size-4 animate-spin" />
			) : session ? (
				<Button loading={isLoggingOut} loadingText="Logging out..." onClick={logout}>
					Logout
				</Button>
			) : (
				<Button nativeButton={false} render={<Link href="/login">Login</Link>}>
					Login
				</Button>
			)}
		</div>
	);
}
