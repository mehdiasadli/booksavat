"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { authClient } from "@/lib/auth-client";
import { client, orpc } from "@/lib/orpc";
import type { EligibleClubForWorkDto } from "@/server/contracts/club.contract";

interface AddToClubDialogProps {
	workId: string;
}

export function AddToClubDialog({ workId }: AddToClubDialogProps) {
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const enabled = Boolean(session?.user);

	const eligibleQuery = useQuery({
		...orpc.club.listEligibleForWork.queryOptions({
			input: { workId },
		}),
		enabled,
		staleTime: 15_000,
	});

	const add = useMutation({
		mutationFn: (slug: string) => client.club.addBooklistItem({ slug, workId }),
		onSuccess: async (item) => {
			toast.success(
				item.status === "proposed" ? `Proposed “${item.title}”` : `Added “${item.title}”`,
			);
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: orpc.club.listEligibleForWork.queryKey({ input: { workId } }),
				}),
				queryClient.invalidateQueries({ queryKey: orpc.club.key() }),
			]);
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not update club booklist");
		},
	});

	if (sessionPending || !session?.user) {
		return null;
	}

	const clubs = eligibleQuery.data?.clubs ?? [];

	if (eligibleQuery.isSuccess && clubs.length === 0) {
		return null;
	}

	if (eligibleQuery.isError) {
		return null;
	}

	if (eligibleQuery.isPending && !eligibleQuery.data) {
		return null;
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger
				render={
					<Button size="sm" variant="outline">
						<Users className="size-3.5" />
						Add to club
					</Button>
				}
			/>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Add to club</DialogTitle>
					<DialogDescription>
						Add or propose this book to a club booklist. You can update more than one club.
					</DialogDescription>
				</DialogHeader>

				<ul className="max-h-80 space-y-1 overflow-y-auto overscroll-contain py-1">
					{clubs.map((club) => (
						<ClubRow
							key={club.id}
							club={club}
							busy={add.isPending && add.variables === club.slug}
							disabled={add.isPending}
							onAction={() => add.mutate(club.slug)}
						/>
					))}
				</ul>
			</DialogContent>
		</Dialog>
	);
}

function ClubRow({
	club,
	busy,
	disabled,
	onAction,
}: {
	club: EligibleClubForWorkDto;
	busy: boolean;
	disabled: boolean;
	onAction: () => void;
}) {
	const alreadyIncluded = club.booklistStatus === "active";
	const alreadyProposed = club.booklistStatus === "proposed";
	const locked = alreadyIncluded || alreadyProposed;

	let actionLabel = "Add";
	if (alreadyIncluded) {
		actionLabel = "Already included";
	} else if (alreadyProposed) {
		actionLabel = "Already proposed";
	} else if (club.canPropose) {
		actionLabel = "Propose";
	}

	return (
		<li className="flex items-center gap-3 rounded-md px-2 py-2 ring-1 ring-transparent hover:bg-muted/40">
			<div className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-muted">
				<Users className="size-4 text-muted-foreground" aria-hidden />
			</div>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium">{club.name}</p>
				<p className="truncate text-xs text-muted-foreground">@{club.slug}</p>
			</div>
			<Button
				size="sm"
				variant={locked ? "secondary" : "default"}
				disabled={locked || disabled}
				onClick={onAction}
			>
				{busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
				{actionLabel}
			</Button>
		</li>
	);
}
