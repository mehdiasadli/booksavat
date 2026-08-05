"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, Star } from "lucide-react";
import Link from "next/link";

import { BookCover } from "@/components/books/book-cover";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/users/user-avatar";
import { authClient } from "@/lib/auth-client";
import { formatRelativeTime } from "@/lib/dates";
import { orpc } from "@/lib/orpc";

function statusLabel(status: "reading" | "completed" | "dnf", isReread: boolean): string {
	const base =
		status === "reading" ? "started reading" : status === "completed" ? "finished" : "marked DNF";
	return isReread ? `re-read — ${base}` : base;
}

export function ActivityFeed() {
	const { data: session, isPending: sessionPending } = authClient.useSession();

	const { data, isPending, isError, error } = useQuery({
		...orpc.follow.listFeed.queryOptions({ input: { limit: 40, offset: 0 } }),
		enabled: Boolean(session?.user),
	});

	if (sessionPending) {
		return (
			<div className="flex justify-center py-16">
				<Loader2 className="size-5 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!session?.user) {
		return (
			<section className="mx-auto flex max-w-2xl flex-col items-start gap-4 py-8">
				<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Home</p>
				<h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
					Welcome to BookSavat
				</h1>
				<p className="text-sm text-muted-foreground text-pretty sm:text-base">
					Sign in to see reading activity from people you follow.
				</p>
				<Button nativeButton={false} render={<Link href="/login">Sign in</Link>} />
			</section>
		);
	}

	return (
		<section className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
			<header className="grid gap-2">
				<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Home</p>
				<h1 className="font-heading text-3xl font-semibold tracking-tight">Activity</h1>
				<p className="text-sm text-muted-foreground text-pretty">
					Updates from you and people you follow.
				</p>
			</header>

			{isPending ? (
				<div className="flex justify-center py-12">
					<Loader2 className="size-5 animate-spin text-muted-foreground" />
				</div>
			) : isError ? (
				<p className="text-sm text-destructive">
					{error instanceof Error ? error.message : "Failed to load feed"}
				</p>
			) : !data?.items.length ? (
				<div className="grid gap-3 border border-dashed border-border px-6 py-12 text-center">
					<p className="text-sm text-muted-foreground">
						No activity yet. Follow readers or log a book to get started.
					</p>
					<div className="flex justify-center gap-2">
						<Button
							size="sm"
							nativeButton={false}
							render={<Link href="/people">Find people</Link>}
						/>
						<Button
							size="sm"
							variant="outline"
							nativeButton={false}
							render={<Link href="/books">Browse books</Link>}
						/>
					</div>
				</div>
			) : (
				<ul className="flex flex-col gap-4">
					{data.items.map((item) => (
						<li key={item.id} className="flex gap-3 border-b border-border pb-4 last:border-0">
							<Link href={`/users/${item.user.username}`} className="shrink-0">
								<UserAvatar name={item.user.name} image={item.user.image} size="md" />
							</Link>
							<div className="min-w-0 flex-1">
								<p className="text-sm text-pretty">
									<Link
										href={`/users/${item.user.username}`}
										className="font-medium hover:underline"
									>
										{item.user.name}
									</Link>{" "}
									{item.type === "reading_log" ? (
										<span className="text-muted-foreground">
											{statusLabel(item.status, item.isReread)}
										</span>
									) : (
										<span className="text-muted-foreground">
											rated {item.rating.toFixed(1)}
											{item.hasReview ? " and reviewed" : ""}
										</span>
									)}{" "}
									<Link href={`/books/${item.workId}`} className="font-medium hover:underline">
										{item.title}
									</Link>
								</p>
								<p className="mt-0.5 text-xs text-muted-foreground">
									{formatRelativeTime(item.occurredAt)}
								</p>
								<div className="mt-3 flex items-center gap-3">
									<Link href={`/books/${item.workId}`}>
										<BookCover src={item.coverUrl} alt={item.title} size="sm" />
									</Link>
									{item.type === "feedback" ? (
										<span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
											<Star className="size-3.5 fill-current" aria-hidden />
											{item.rating.toFixed(1)}
										</span>
									) : null}
								</div>
							</div>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
