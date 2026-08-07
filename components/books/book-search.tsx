"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, Lock, Search, Users, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { BookSearchItem } from "@/components/books/book-search-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/users/user-avatar";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";

const SEARCH_LIMIT = 6;
const DEBOUNCE_MS = 300;

interface BookSearchProps {
	className?: string;
	compact?: boolean;
}

export function BookSearch({ className, compact }: BookSearchProps) {
	const listId = useId();
	const rootRef = useRef<HTMLDivElement>(null);
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");

	useEffect(() => {
		const timer = window.setTimeout(() => {
			setDebouncedQuery(query.trim());
		}, DEBOUNCE_MS);

		return () => window.clearTimeout(timer);
	}, [query]);

	useEffect(() => {
		function onPointerDown(event: MouseEvent) {
			if (!rootRef.current?.contains(event.target as Node)) {
				setOpen(false);
			}
		}

		function onKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setOpen(false);
			}
		}

		document.addEventListener("mousedown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("mousedown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, []);

	const enabled = debouncedQuery.length >= 2;

	const booksQuery = useQuery({
		...orpc.book.search.queryOptions({
			input: { q: debouncedQuery, limit: SEARCH_LIMIT },
		}),
		enabled: enabled && open,
		staleTime: 60_000,
		// Open Library timeouts are common; default RQ retries multiply wait time.
		retry: false,
	});

	const usersQuery = useQuery({
		...orpc.follow.searchUsers.queryOptions({
			input: { q: debouncedQuery, limit: 5, offset: 0 },
		}),
		enabled: enabled && open,
		staleTime: 60_000,
		retry: 1,
	});

	const clubsQuery = useQuery({
		...orpc.club.search.queryOptions({
			input: { q: debouncedQuery, limit: 5, offset: 0 },
		}),
		enabled: enabled && open,
		staleTime: 60_000,
		retry: 1,
	});

	const showPanel = open && query.length > 0;
	const isFetching = booksQuery.isFetching || usersQuery.isFetching || clubsQuery.isFetching;
	const hasSettledData = booksQuery.isSuccess || usersQuery.isSuccess || clubsQuery.isSuccess;
	const totalFailure =
		enabled &&
		!isFetching &&
		!hasSettledData &&
		booksQuery.isError &&
		usersQuery.isError &&
		clubsQuery.isError;
	const books = booksQuery.data?.items ?? [];
	const users = usersQuery.data?.items ?? [];
	const clubs = clubsQuery.data?.items ?? [];
	const empty =
		enabled &&
		!isFetching &&
		hasSettledData &&
		books.length === 0 &&
		users.length === 0 &&
		clubs.length === 0 &&
		!booksQuery.isError;

	function clearAndClose() {
		setOpen(false);
		setQuery("");
		setDebouncedQuery("");
	}

	return (
		<div ref={rootRef} className={cn("relative w-full", className)}>
			<Search
				className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-4 -translate-y-1/2 text-muted-foreground"
				aria-hidden
			/>
			<Input
				value={query}
				onChange={(event) => {
					setQuery(event.target.value);
					setOpen(true);
				}}
				onFocus={() => setOpen(true)}
				placeholder={compact ? "Search…" : "Search books, people, clubs…"}
				className="h-9 pr-9 pl-8"
				role="combobox"
				aria-expanded={showPanel}
				aria-controls={listId}
				aria-autocomplete="list"
				autoComplete="off"
			/>
			{query ? (
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					className="absolute top-1/2 right-1.5 z-10 -translate-y-1/2"
					onClick={() => {
						setQuery("");
						setDebouncedQuery("");
					}}
					aria-label="Clear search"
				>
					<X className="size-3.5" />
				</Button>
			) : null}

			{showPanel ? (
				<div
					id={listId}
					role="listbox"
					aria-label="Search results"
					className="absolute top-[calc(100%+0.35rem)] right-0 left-0 z-50 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10"
				>
					{!enabled ? (
						<p className="px-3 py-4 text-sm text-muted-foreground">
							Type at least 2 characters to search.
						</p>
					) : isFetching && !hasSettledData ? (
						<div className="space-y-2 p-2">
							{["a", "b", "c"].map((key) => (
								<div key={key} className="flex gap-3 px-2 py-2">
									<Skeleton className="h-10 w-10 shrink-0 rounded-sm" />
									<div className="flex-1 space-y-2">
										<Skeleton className="h-4 w-3/4" />
										<Skeleton className="h-3 w-1/2" />
									</div>
								</div>
							))}
						</div>
					) : totalFailure ? (
						<p className="px-3 py-4 text-sm text-destructive">Search failed. Try again.</p>
					) : empty ? (
						<p className="px-3 py-4 text-sm text-muted-foreground">
							No books, people, or clubs found for “{debouncedQuery}”.
						</p>
					) : (
						<div className="max-h-96 overflow-y-auto overscroll-contain">
							<div className="flex flex-col gap-0.5 p-1">
								{isFetching ? (
									<div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
										<Loader2 className="size-3.5 animate-spin" />
										Updating results…
									</div>
								) : null}

								{users.length > 0 ? (
									<div className="px-3 pt-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
										People
									</div>
								) : null}
								{users.map((person) => (
									<Link
										key={person.id}
										href={`/users/${person.username}`}
										onClick={clearAndClose}
										className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/70"
									>
										<UserAvatar name={person.name} image={person.image} size="md" />
										<div className="min-w-0 flex-1">
											<p className="truncate font-medium leading-snug">{person.name}</p>
											<p className="truncate text-xs text-muted-foreground">@{person.username}</p>
										</div>
										{person.isPrivate ? (
											<Lock
												className="size-3.5 shrink-0 text-muted-foreground"
												aria-label="Private"
											/>
										) : null}
									</Link>
								))}

								{clubs.length > 0 ? (
									<div className="px-3 pt-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
										Clubs
									</div>
								) : null}
								{clubs.map((club) => (
									<Link
										key={club.id}
										href={`/clubs/${club.slug}`}
										onClick={clearAndClose}
										className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/70"
									>
										<div className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-muted">
											<Users className="size-4 text-muted-foreground" aria-hidden />
										</div>
										<div className="min-w-0 flex-1">
											<p className="truncate font-medium leading-snug">{club.name}</p>
											<p className="truncate text-xs text-muted-foreground">
												@{club.slug}
												{club.visibility === "private" ? " · Private" : ""}
											</p>
										</div>
										{club.visibility === "private" ? (
											<Lock
												className="size-3.5 shrink-0 text-muted-foreground"
												aria-label="Private"
											/>
										) : null}
									</Link>
								))}

								{booksQuery.isError ? (
									<p className="px-3 py-3 text-sm text-destructive">
										Books unavailable right now. Try again in a moment.
									</p>
								) : null}

								{books.length > 0 ? (
									<div className="px-3 pt-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
										Books
									</div>
								) : null}
								{books.map((book) => (
									<BookSearchItem key={book.workId} book={book} onSelect={clearAndClose} />
								))}

								{booksQuery.data && booksQuery.data.total > books.length ? (
									<p className="px-3 py-2 text-xs text-muted-foreground">
										Showing {books.length} of {booksQuery.data.total.toLocaleString()} books
									</p>
								) : null}
							</div>
						</div>
					)}
				</div>
			) : null}
		</div>
	);
}
