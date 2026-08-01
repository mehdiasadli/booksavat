"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { BookCover } from "@/components/books/book-cover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { client } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import type { BookEditionSummary } from "@/server/contracts/book.contract";

const PAGE_SIZE = 12;
const DEBOUNCE_MS = 250;

interface WorkEditionsProps {
	workId: string;
	initialItems: BookEditionSummary[];
	initialTotal: number;
	initialNextOffset: number | null;
}

function editionSearchText(edition: BookEditionSummary): string {
	return [
		edition.title,
		edition.subtitle,
		edition.publishDate,
		edition.editionId,
		...edition.publishers,
		...edition.isbn10,
		...edition.isbn13,
		...edition.languages,
	]
		.filter(Boolean)
		.join(" ")
		.toLowerCase();
}

function mergeEditions(
	current: BookEditionSummary[],
	incoming: BookEditionSummary[],
): BookEditionSummary[] {
	const seen = new Set(current.map((edition) => edition.editionId));
	const merged = [...current];

	for (const edition of incoming) {
		if (!seen.has(edition.editionId)) {
			seen.add(edition.editionId);
			merged.push(edition);
		}
	}

	return merged;
}

function EditionCard({ edition }: { edition: BookEditionSummary }) {
	const publishLine =
		[edition.publishDate, edition.publishers[0]].filter(Boolean).join(" · ") ||
		"Publication details not provided";
	const languageLine =
		edition.languages.length > 0 ? edition.languages.join(", ") : "Language not provided";
	const isbn = edition.isbn13[0] ?? edition.isbn10[0];
	const isbnLine = isbn ? `ISBN ${isbn}` : "ISBN not provided";
	const pagesLine =
		edition.pageCount != null ? `${edition.pageCount} pages` : "Page count not provided";

	return (
		<Link
			href={`/books/edition/${edition.editionId}`}
			className="flex h-full gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40"
		>
			<BookCover src={edition.coverUrl} alt={edition.title} size="sm" />
			<div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
				<p className="truncate font-medium">{edition.title}</p>
				<p className="truncate text-xs text-muted-foreground">{publishLine}</p>
				<p
					className={cn(
						"truncate text-xs",
						edition.languages.length > 0 ? "text-muted-foreground" : "text-muted-foreground/70",
					)}
				>
					{languageLine}
				</p>
				<p
					className={cn(
						"truncate font-mono text-[11px]",
						isbn ? "text-muted-foreground" : "text-muted-foreground/70",
					)}
				>
					{isbnLine}
				</p>
				<p
					className={cn(
						"text-xs",
						edition.pageCount != null ? "text-muted-foreground" : "text-muted-foreground/70",
					)}
				>
					{pagesLine}
				</p>
			</div>
		</Link>
	);
}

function useDebouncedValue(value: string, delayMs: number) {
	const [debounced, setDebounced] = useState(value);

	useEffect(() => {
		const timer = window.setTimeout(() => setDebounced(value), delayMs);
		return () => window.clearTimeout(timer);
	}, [value, delayMs]);

	return debounced;
}

export function WorkEditions({
	workId,
	initialItems,
	initialTotal,
	initialNextOffset,
}: WorkEditionsProps) {
	const [query, setQuery] = useState("");
	const debouncedQuery = useDebouncedValue(query.trim().toLowerCase(), DEBOUNCE_MS);
	const [items, setItems] = useState(initialItems);
	const [total, setTotal] = useState(initialTotal);
	const [nextOffset, setNextOffset] = useState(initialNextOffset);

	const loadMore = useMutation({
		mutationFn: async (offset: number) =>
			client.book.listWorkEditions({
				workId,
				limit: PAGE_SIZE,
				offset,
			}),
		onSuccess: (page) => {
			setItems((current) => mergeEditions(current, page.items));
			setTotal(page.total);
			setNextOffset(page.nextOffset);
		},
	});

	const filtered = useMemo(() => {
		if (!debouncedQuery) {
			return items;
		}

		return items.filter((edition) => editionSearchText(edition).includes(debouncedQuery));
	}, [items, debouncedQuery]);

	const hasMore = nextOffset != null;
	const searching = debouncedQuery.length > 0;
	const loading = loadMore.isPending;

	return (
		<section className="space-y-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h2 className="font-heading text-lg font-semibold tracking-tight">Editions</h2>
					<p className="text-sm text-muted-foreground">
						{total > 0
							? searching
								? `${filtered.length.toLocaleString()} match${filtered.length === 1 ? "" : "es"} in ${items.length.toLocaleString()} loaded of ${total.toLocaleString()}`
								: `Showing ${items.length.toLocaleString()} of ${total.toLocaleString()}`
							: "No editions listed yet"}
					</p>
				</div>

				{total > 0 ? (
					<div className="relative w-full sm:max-w-xs">
						<Search
							className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
							aria-hidden
						/>
						<Input
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Search this book’s editions…"
							className="h-9 pr-9 pl-8"
							autoComplete="off"
							aria-label="Search editions of this book"
						/>
						{query ? (
							<Button
								type="button"
								variant="ghost"
								size="icon-xs"
								className="absolute top-1/2 right-1.5 -translate-y-1/2"
								onClick={() => setQuery("")}
								aria-label="Clear edition search"
							>
								<X className="size-3.5" />
							</Button>
						) : null}
					</div>
				) : null}
			</div>

			{total === 0 ? (
				<p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
					We couldn’t find editions for this work right now.
				</p>
			) : filtered.length === 0 ? (
				<div className="space-y-3 rounded-lg border border-dashed px-4 py-8 text-center">
					<p className="text-sm text-muted-foreground">
						No loaded editions match “{debouncedQuery}”.
					</p>
					{hasMore ? (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => loadMore.mutate(nextOffset)}
							disabled={loading}
						>
							{loading ? (
								<>
									<Loader2 className="size-4 animate-spin" />
									Loading…
								</>
							) : (
								"Load more editions to search"
							)}
						</Button>
					) : null}
				</div>
			) : (
				<ul className="grid auto-rows-fr gap-3 sm:grid-cols-2">
					{filtered.map((edition) => (
						<li key={edition.editionId} className="h-full">
							<EditionCard edition={edition} />
						</li>
					))}
				</ul>
			)}

			{loadMore.isError ? (
				<p className="text-sm text-destructive">
					{loadMore.error instanceof Error
						? loadMore.error.message
						: "Could not load more editions."}
				</p>
			) : null}

			{hasMore && filtered.length > 0 ? (
				<div className="flex justify-center">
					<Button
						type="button"
						variant="outline"
						onClick={() => loadMore.mutate(nextOffset)}
						disabled={loading}
					>
						{loading ? (
							<>
								<Loader2 className="size-4 animate-spin" />
								Loading…
							</>
						) : (
							`Load more editions (${items.length} of ${total.toLocaleString()})`
						)}
					</Button>
				</div>
			) : null}
		</section>
	);
}
