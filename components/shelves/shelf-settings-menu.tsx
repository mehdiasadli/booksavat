"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { client, orpc } from "@/lib/orpc";
import type { ShelfSummaryDto, ShelfVisibilityDto } from "@/server/contracts/shelf.contract";

interface ShelfSettingsMenuProps {
	username: string;
	shelf: ShelfSummaryDto;
}

export function ShelfSettingsMenu({ username, shelf }: ShelfSettingsMenuProps) {
	const router = useRouter();
	const queryClient = useQueryClient();

	async function invalidate() {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: orpc.shelf.listByUsername.queryKey({ input: { username } }),
			}),
			queryClient.invalidateQueries({
				queryKey: orpc.shelf.getByUsernameAndSlug.queryKey({
					input: { username, slug: shelf.slug, limit: 40, offset: 0 },
				}),
			}),
		]);
		router.refresh();
	}

	const update = useMutation({
		mutationFn: (patch: { visibility?: ShelfVisibilityDto; isOrdered?: boolean }) =>
			client.shelf.update({ shelfId: shelf.id, ...patch }),
		onSuccess: async () => {
			toast.success("Shelf updated");
			await invalidate();
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not update shelf");
		},
	});

	const remove = useMutation({
		mutationFn: () => client.shelf.delete({ shelfId: shelf.id }),
		onSuccess: async () => {
			toast.success("Shelf deleted");
			await invalidate();
			router.push(`/users/${username}/shelves`);
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not delete shelf");
		},
	});

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button variant="ghost" size="icon-sm" aria-label="Shelf settings">
						<MoreHorizontal className="size-4" />
					</Button>
				}
			/>
			<DropdownMenuContent align="end" className="min-w-48">
				<DropdownMenuGroup>
					<DropdownMenuLabel>Visibility</DropdownMenuLabel>
					{(
						[
							["private", "Private"],
							["followers_only", "Followers only"],
							["public", "Public"],
						] as const
					).map(([value, label]) => (
						<DropdownMenuItem
							key={value}
							disabled={update.isPending || shelf.visibility === value}
							onClick={() => update.mutate({ visibility: value })}
						>
							{label}
							{shelf.visibility === value ? " ✓" : ""}
						</DropdownMenuItem>
					))}
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					disabled={update.isPending}
					onClick={() => update.mutate({ isOrdered: !shelf.isOrdered })}
				>
					{shelf.isOrdered ? "Make unordered" : "Make ordered"}
				</DropdownMenuItem>
				{!shelf.isSystem ? (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							variant="destructive"
							disabled={remove.isPending}
							onClick={() => {
								if (window.confirm(`Delete “${shelf.name}”? This cannot be undone.`)) {
									remove.mutate();
								}
							}}
						>
							Delete shelf
						</DropdownMenuItem>
					</>
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
