"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/users/user-avatar";
import { client, orpc } from "@/lib/orpc";

const DEBOUNCE_MS = 250;
const SEARCH_LIMIT = 8;

interface InviteMemberDialogProps {
	slug: string;
}

export function InviteMemberDialog({ slug }: InviteMemberDialogProps) {
	const listId = useId();
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [selected, setSelected] = useState<{
		username: string;
		name: string;
		image: string | null;
	} | null>(null);

	useEffect(() => {
		const timer = window.setTimeout(() => {
			setDebouncedQuery(query.trim().replace(/^@/, ""));
		}, DEBOUNCE_MS);
		return () => window.clearTimeout(timer);
	}, [query]);

	const searchTerm = query.trim().replace(/^@/, "");
	const enabled = open && !selected && debouncedQuery.length >= 2;

	const usersQuery = useQuery({
		...orpc.follow.searchUsers.queryOptions({
			input: { q: debouncedQuery, limit: SEARCH_LIMIT, offset: 0 },
		}),
		enabled,
		staleTime: 30_000,
	});

	const users = usersQuery.data?.items ?? [];
	const showResults = open && !selected && searchTerm.length >= 2;

	function reset() {
		setQuery("");
		setDebouncedQuery("");
		setSelected(null);
	}

	const invite = useMutation({
		mutationFn: () => {
			if (!selected) {
				throw new Error("Pick someone to invite");
			}
			return client.club.invite({ slug, username: selected.username });
		},
		onSuccess: async () => {
			toast.success(`Invite sent to @${selected?.username}`);
			setOpen(false);
			reset();
			await queryClient.invalidateQueries({ queryKey: orpc.club.key() });
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not invite");
		},
	});

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) reset();
			}}
		>
			<DialogTrigger render={<Button size="sm">Invite by username</Button>} />
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Invite a member</DialogTitle>
					<DialogDescription>They’ll see the invite on their Clubs page.</DialogDescription>
				</DialogHeader>

				<div className="grid gap-2 py-2">
					<Label htmlFor="invite-username">Search people</Label>

					{selected ? (
						<div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
							<UserAvatar name={selected.name} image={selected.image} size="sm" />
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium">{selected.name}</p>
								<p className="truncate text-xs text-muted-foreground">@{selected.username}</p>
							</div>
							<Button
								type="button"
								size="icon-xs"
								variant="ghost"
								aria-label="Clear selection"
								onClick={() => {
									setSelected(null);
									setQuery("");
									setDebouncedQuery("");
								}}
							>
								<X className="size-3.5" />
							</Button>
						</div>
					) : (
						<div className="relative">
							<Search
								className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
								aria-hidden
							/>
							<Input
								id="invite-username"
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								placeholder="Search by name or username"
								autoComplete="off"
								className="pl-8"
								role="combobox"
								aria-expanded={showResults}
								aria-controls={listId}
								aria-autocomplete="list"
							/>

							{showResults ? (
								<div
									id={listId}
									role="listbox"
									aria-label="People"
									className="absolute top-[calc(100%+0.35rem)] right-0 left-0 z-50 max-h-64 overflow-y-auto overscroll-contain rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10"
								>
									{!enabled || (usersQuery.isFetching && !usersQuery.data) ? (
										<div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
											<Loader2 className="size-3.5 animate-spin" />
											Searching…
										</div>
									) : usersQuery.isError ? (
										<p className="px-3 py-3 text-sm text-destructive">Search failed. Try again.</p>
									) : users.length === 0 ? (
										<p className="px-3 py-3 text-sm text-muted-foreground">
											No people found for “{debouncedQuery}”.
										</p>
									) : (
										<ul className="flex flex-col gap-0.5 p-1">
											{users.map((person) => (
												<li key={person.id}>
													<button
														type="button"
														role="option"
														className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/70"
														onClick={() => {
															setSelected({
																username: person.username,
																name: person.name,
																image: person.image,
															});
															setQuery("");
															setDebouncedQuery("");
														}}
													>
														<UserAvatar name={person.name} image={person.image} size="sm" />
														<div className="min-w-0 flex-1">
															<p className="truncate text-sm font-medium">{person.name}</p>
															<p className="truncate text-xs text-muted-foreground">
																@{person.username}
															</p>
														</div>
													</button>
												</li>
											))}
										</ul>
									)}
								</div>
							) : null}
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						Cancel
					</Button>
					<Button disabled={!selected || invite.isPending} onClick={() => invite.mutate()}>
						{invite.isPending ? "Sending…" : "Send invite"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
