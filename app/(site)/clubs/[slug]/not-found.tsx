import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function ClubNotFound() {
	return (
		<section className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16 text-center sm:px-6">
			<h1 className="font-heading text-2xl font-semibold tracking-tight">Club not found</h1>
			<p className="text-sm text-muted-foreground text-pretty">
				This club doesn’t exist, or you don’t have access to view it.
			</p>
			<Button nativeButton={false} render={<Link href="/clubs">Browse clubs</Link>} />
		</section>
	);
}
