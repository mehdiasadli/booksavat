"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookmarkPlus, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { client, orpc } from "@/lib/orpc";
import type { ShelfSystemKeyDto } from "@/server/contracts/shelf.contract";

interface AddToShelfProps {
	workId: string;
}

export function AddToShelf({ workId }: AddToShelfProps) {
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const queryClient = useQueryClient();
	const enabled = Boolean(session?.user);

	const shelvesQuery = useQuery({
		...orpc.shelf.listByUsername.queryOptions({
			input: { username: session?.user?.username ?? "" },
		}),
		enabled: enabled && Boolean(session?.user?.username),
		staleTime: 30_000,
	});

	const membershipQuery = useQuery({
		...orpc.shelf.membershipForWork.queryOptions({
			input: { workId },
		}),
		enabled,
		staleTime: 15_000,
	});

	const membershipIds = useMemo(
		() => new Set(membershipQuery.data?.memberships.map((item) => item.shelfId) ?? []),
		[membershipQuery.data],
	);

	const systemShelves = useMemo(
		() => shelvesQuery.data?.shelves.filter((shelf) => shelf.isSystem) ?? [],
		[shelvesQuery.data],
	);

	const customShelves = useMemo(
		() => shelvesQuery.data?.shelves.filter((shelf) => !shelf.isSystem) ?? [],
		[shelvesQuery.data],
	);

	const activeSystemKey =
		membershipQuery.data?.memberships.find((item) => item.isSystem)?.systemKey ?? "";

	async function invalidate() {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: orpc.shelf.membershipForWork.queryKey({ input: { workId } }),
			}),
			session?.user?.username
				? queryClient.invalidateQueries({
						queryKey: orpc.shelf.listByUsername.queryKey({
							input: { username: session.user.username },
						}),
					})
				: Promise.resolve(),
		]);
	}

	const add = useMutation({
		mutationFn: (shelfId: string) => client.shelf.addWork({ shelfId, workId }),
		onSuccess: async () => {
			toast.success("Added to shelf");
			await invalidate();
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not add to shelf");
		},
	});

	const remove = useMutation({
		mutationFn: (shelfId: string) => client.shelf.removeWork({ shelfId, workId }),
		onSuccess: async () => {
			toast.success("Removed from shelf");
			await invalidate();
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not remove from shelf");
		},
	});

	if (sessionPending) {
		return (
			<Button size="sm" variant="outline" disabled>
				<Loader2 className="size-3.5 animate-spin" />
				Shelves
			</Button>
		);
	}

	if (!session?.user) {
		return null;
	}

	const busy = add.isPending || remove.isPending;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button size="sm" variant="secondary" disabled={busy}>
						{busy ? (
							<Loader2 className="size-3.5 animate-spin" />
						) : (
							<BookmarkPlus className="size-3.5" />
						)}
						Shelves
					</Button>
				}
			/>
			<DropdownMenuContent align="start" className="min-w-56">
				<DropdownMenuGroup>
					<DropdownMenuLabel>Status</DropdownMenuLabel>
					{shelvesQuery.isLoading || membershipQuery.isLoading ? (
						<p className="px-2 py-1.5 text-xs text-muted-foreground">Loading…</p>
					) : (
						<DropdownMenuRadioGroup
							value={activeSystemKey ?? ""}
							onValueChange={(value) => {
								const shelf = systemShelves.find(
									(item) => item.systemKey === (value as ShelfSystemKeyDto),
								);
								if (!shelf) {
									return;
								}

								if (membershipIds.has(shelf.id)) {
									remove.mutate(shelf.id);
									return;
								}

								add.mutate(shelf.id);
							}}
						>
							{systemShelves.map((shelf) => (
								<DropdownMenuRadioItem key={shelf.id} value={shelf.systemKey ?? ""}>
									{shelf.name}
								</DropdownMenuRadioItem>
							))}
						</DropdownMenuRadioGroup>
					)}
					{activeSystemKey ? (
						<DropdownMenuItem
							disabled={busy}
							onClick={() => {
								const shelf = systemShelves.find((item) => item.systemKey === activeSystemKey);
								if (shelf) {
									remove.mutate(shelf.id);
								}
							}}
						>
							Clear status
						</DropdownMenuItem>
					) : null}
				</DropdownMenuGroup>

				{customShelves.length > 0 ? (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuLabel>Custom</DropdownMenuLabel>
							{customShelves.map((shelf) => {
								const checked = membershipIds.has(shelf.id);
								return (
									<DropdownMenuCheckboxItem
										key={shelf.id}
										checked={checked}
										onCheckedChange={(next) => {
											if (next) {
												add.mutate(shelf.id);
											} else {
												remove.mutate(shelf.id);
											}
										}}
									>
										{shelf.name}
									</DropdownMenuCheckboxItem>
								);
							})}
						</DropdownMenuGroup>
					</>
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
