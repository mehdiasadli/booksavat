"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function HomePage() {
	const { data: session, isPending } = authClient.useSession();

	return (
		<section className="mx-auto flex max-w-2xl flex-col items-start gap-4 py-8">
			<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Home</p>
			<h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
				{isPending
					? "Welcome"
					: session?.user
						? `Welcome, ${session.user.name}`
						: "Welcome to BookSavat"}
			</h1>
			<p className="text-sm text-muted-foreground text-pretty sm:text-base">
				Search the catalog, open a work, and browse editions. Shelves and clubs come next.
			</p>
			<Button nativeButton={false} render={<Link href="/books">Browse books</Link>} />
		</section>
	);
}
