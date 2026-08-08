"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";

import { BookCover } from "@/components/books/book-cover";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { client, orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 300;

interface AddBooksToShelfDialogProps {
	shelfId: string;
	shelfName: string;
	username: string;
	shelfSlug: string;
	initialWorkIds: string[];
}

export function AddBooksToShelfDialog({
	shelfId,
	shelfName,
	username,
	shelfSlug,
	initialWorkIds,
}: AddBooksToShelfDialogProps) {
	const listId = useId();
	const router = useRouter();
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [addedWorkIds, setAddedWorkIds] = useState<string[]>([]);

	useEffect(() => {
		const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), DEBOUNCE_MS);
		return () => window.clearTimeout(timer);
	}, [query]);

	const enabled = open && debouncedQuery.length >= 2;

	const booksQuery = useQuery({
		...orpc.book.search.queryOptions({
			input: { q: debouncedQuery, limit: 8 },
		}),
		enabled,
		staleTime: 30_000,
		retry: false,
	});

	const books = booksQuery.data?.items ?? [];

	const knownOnShelf = useMemo(() => {
		const ids = new Set(initialWorkIds);
		for (const workId of addedWorkIds) {
			ids.add(workId);
		}
		return ids;
	}, [initialWorkIds, addedWorkIds]);

	const membershipQueries = useQueries({
		queries: books.map((book) => ({
			...orpc.shelf.membershipForWork.queryOptions({
				input: { workId: book.workId },
			}),
			enabled: enabled && !knownOnShelf.has(book.workId),
			staleTime: 15_000,
		})),
	});

	const onShelfFromMembership = useMemo(() => {
		const ids = new Set<string>();
		for (const [index, book] of books.entries()) {
			const memberships = membershipQueries[index]?.data?.memberships;
			if (memberships?.some((item) => item.shelfId === shelfId)) {
				ids.add(book.workId);
			}
		}
		return ids;
	}, [books, membershipQueries, shelfId]);

	function isOnShelf(workId: string): boolean {
		return knownOnShelf.has(workId) || onShelfFromMembership.has(workId);
	}

	async function invalidate() {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: orpc.shelf.getByUsernameAndSlug.queryKey({
					input: { username, slug: shelfSlug },
				}),
			}),
			queryClient.invalidateQueries({
				queryKey: orpc.shelf.listByUsername.queryKey({ input: { username } }),
			}),
			queryClient.invalidateQueries({ queryKey: orpc.shelf.key() }),
		]);
		router.refresh();
	}

	const add = useMutation({
		mutationFn: (workId: string) => client.shelf.addWork({ shelfId, workId }),
		onSuccess: async (item) => {
			toast.success(`Added “${item.title}” to ${shelfName}`);
			setAddedWorkIds((current) =>
				current.includes(item.workId) ? current : [...current, item.workId],
			);
			await invalidate();
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not add book");
		},
	});

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) {
					setQuery("");
					setDebouncedQuery("");
				}
			}}
		>
			<DialogTrigger render={<Button size="sm">Add books</Button>} />
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Add to {shelfName}</DialogTitle>
					<DialogDescription>
						Search Open Library and add a work directly to this shelf.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-2 py-1">
					<Label htmlFor="shelf-book-search">Search books</Label>
					<div className="relative">
						<Search
							className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
							aria-hidden
						/>
						<Input
							id="shelf-book-search"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Search by title or author"
							autoComplete="off"
							className="pl-8"
							aria-controls={listId}
							aria-autocomplete="list"
						/>
					</div>

					<div
						id={listId}
						role="listbox"
						aria-label="Book results"
						className="max-h-72 overflow-y-auto overscroll-contain rounded-lg ring-1 ring-foreground/10"
					>
						{query.trim().length < 2 ? (
							<p className="px-3 py-4 text-sm text-muted-foreground">
								Type at least 2 characters to search.
							</p>
						) : booksQuery.isFetching && !booksQuery.data ? (
							<div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
								<Loader2 className="size-3.5 animate-spin" />
								Searching…
							</div>
						) : booksQuery.isError ? (
							<p className="px-3 py-4 text-sm text-destructive">
								Open Library is unavailable right now. Try again in a moment.
							</p>
						) : books.length === 0 ? (
							<p className="px-3 py-4 text-sm text-muted-foreground">
								No books found for “{debouncedQuery}”.
							</p>
						) : (
							<ul className="flex flex-col gap-0.5 p-1">
								{books.map((book, index) => {
									const alreadyOnShelf = isOnShelf(book.workId);
									const membershipPending = !alreadyOnShelf && membershipQueries[index]?.isFetching;
									const busy = add.isPending && add.variables === book.workId;

									return (
										<li key={book.workId}>
											<button
												type="button"
												role="option"
												disabled={alreadyOnShelf || add.isPending || membershipPending}
												aria-disabled={alreadyOnShelf || undefined}
												className={cn(
													"flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors",
													alreadyOnShelf
														? "cursor-not-allowed opacity-60"
														: "hover:bg-muted/70 disabled:opacity-50",
												)}
												onClick={() => {
													if (!alreadyOnShelf) {
														add.mutate(book.workId);
													}
												}}
											>
												<BookCover src={book.coverUrl} alt={book.title} size="sm" />
												<div className="min-w-0 flex-1">
													<p className="truncate text-sm font-medium">{book.title}</p>
													<p className="truncate text-xs text-muted-foreground">
														{alreadyOnShelf
															? "Already on shelf"
															: book.authors.slice(0, 2).join(", ") || book.workId}
													</p>
												</div>
												{busy || membershipPending ? (
													<Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
												) : null}
											</button>
										</li>
									);
								})}
							</ul>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
