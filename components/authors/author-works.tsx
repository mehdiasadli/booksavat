"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { BookCover } from "@/components/books/book-cover";
import { Button } from "@/components/ui/button";
import { client } from "@/lib/orpc";
import type { AuthorWorkSummary } from "@/server/contracts/author.contract";

const PAGE_SIZE = 24;

interface AuthorWorksProps {
	authorId: string;
	initialItems: AuthorWorkSummary[];
	initialTotal: number;
	initialNextOffset: number | null;
	excludeWorkId?: string;
}

function mergeWorks(
	current: AuthorWorkSummary[],
	incoming: AuthorWorkSummary[],
): AuthorWorkSummary[] {
	const seen = new Set(current.map((work) => work.workId));
	const merged = [...current];

	for (const work of incoming) {
		if (!seen.has(work.workId)) {
			seen.add(work.workId);
			merged.push(work);
		}
	}

	return merged;
}

export function AuthorWorks({
	authorId,
	initialItems,
	initialTotal,
	initialNextOffset,
	excludeWorkId,
}: AuthorWorksProps) {
	const [items, setItems] = useState(() =>
		excludeWorkId ? initialItems.filter((work) => work.workId !== excludeWorkId) : initialItems,
	);
	const [nextOffset, setNextOffset] = useState(initialNextOffset);
	const [total, setTotal] = useState(initialTotal);

	const loadMore = useMutation({
		mutationFn: () =>
			client.author.listWorks({
				authorId,
				limit: PAGE_SIZE,
				offset: nextOffset ?? 0,
			}),
		onSuccess: (page) => {
			setItems((current) => {
				const merged = mergeWorks(current, page.items);
				return excludeWorkId ? merged.filter((work) => work.workId !== excludeWorkId) : merged;
			});
			setNextOffset(page.nextOffset);
			setTotal(page.total);
		},
	});

	if (items.length === 0 && !loadMore.isPending) {
		return (
			<section className="space-y-3">
				<h2 className="font-heading text-lg font-semibold tracking-tight">Works</h2>
				<p className="text-sm text-muted-foreground">No works listed for this author yet.</p>
			</section>
		);
	}

	return (
		<section className="space-y-4">
			<div className="flex items-baseline justify-between gap-3">
				<h2 className="font-heading text-lg font-semibold tracking-tight">Works</h2>
				{total > 0 ? (
					<p className="text-xs text-muted-foreground">{total.toLocaleString()} total</p>
				) : null}
			</div>

			<ul className="grid gap-3 sm:grid-cols-2">
				{items.map((work) => (
					<li key={work.workId}>
						<Link
							href={`/books/${work.workId}`}
							className="flex h-full gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40"
						>
							<BookCover src={work.coverUrl} alt={work.title} size="sm" />
							<div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
								<p className="truncate font-medium">{work.title}</p>
								<p className="truncate text-xs text-muted-foreground">
									{work.firstPublishDate || work.workId}
								</p>
							</div>
						</Link>
					</li>
				))}
			</ul>

			{nextOffset != null ? (
				<div className="flex justify-center">
					<Button
						variant="outline"
						size="sm"
						disabled={loadMore.isPending}
						onClick={() => loadMore.mutate()}
					>
						{loadMore.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
						Load more
					</Button>
				</div>
			) : null}
		</section>
	);
}
