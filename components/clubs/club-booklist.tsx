"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { BookCover } from "@/components/books/book-cover";
import { AddToBooklistDialog } from "@/components/clubs/add-to-booklist-dialog";
import { ClubSubnav } from "@/components/clubs/club-subnav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { client, orpc } from "@/lib/orpc";
import type { ClubDetail } from "@/server/contracts";

const readingLabel: Record<"reading" | "completed" | "dnf", string> = {
	reading: "Reading",
	completed: "Completed",
	dnf: "DNF",
};

interface ClubBooklistProps {
	initial: ClubDetail;
}

export function ClubBooklist({ initial }: ClubBooklistProps) {
	const router = useRouter();
	const queryClient = useQueryClient();

	const { data: club = initial } = useQuery({
		...orpc.club.getBySlug.queryOptions({ input: { slug: initial.slug } }),
		initialData: initial,
	});

	const list = useQuery({
		...orpc.club.listBooklist.queryOptions({
			input: { slug: club.slug, limit: 100, offset: 0 },
		}),
		enabled: club.canViewContent,
	});

	const proposals = useQuery({
		...orpc.club.listBooklistProposals.queryOptions({ input: { slug: club.slug } }),
		enabled: club.canModerateBooklistProposals,
	});

	function invalidate() {
		void queryClient.invalidateQueries({ queryKey: orpc.club.key() });
		router.refresh();
	}

	const remove = useMutation({
		mutationFn: (workId: string) => client.club.removeBooklistItem({ slug: club.slug, workId }),
		onSuccess: () => {
			toast.success("Removed from booklist");
			invalidate();
		},
		onError: (error) =>
			toast.error(error instanceof Error ? error.message : "Could not remove book"),
	});

	const approve = useMutation({
		mutationFn: (workId: string) =>
			client.club.approveBooklistProposal({ slug: club.slug, workId }),
		onSuccess: (item) => {
			toast.success(`Approved “${item.title}”`);
			invalidate();
		},
		onError: (error) => toast.error(error instanceof Error ? error.message : "Could not approve"),
	});

	const reject = useMutation({
		mutationFn: (workId: string) => client.club.rejectBooklistProposal({ slug: club.slug, workId }),
		onSuccess: () => {
			toast.success("Proposal rejected");
			invalidate();
		},
		onError: (error) => toast.error(error instanceof Error ? error.message : "Could not reject"),
	});

	if (!club.canViewContent) {
		return (
			<section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
				<p className="text-sm text-muted-foreground">You can’t view this club’s booklist.</p>
				<Button
					size="sm"
					nativeButton={false}
					render={<Link href={`/clubs/${club.slug}`}>Back</Link>}
				/>
			</section>
		);
	}

	const canContribute = club.canAddToBooklist || club.canProposeToBooklist;
	const busy = remove.isPending || approve.isPending || reject.isPending;

	return (
		<section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
			<ClubSubnav
				slug={club.slug}
				showBooklist
				showMembers={club.canViewContent}
				showSettings={club.canManageSettings}
			/>

			<header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div className="grid gap-1">
					<h1 className="font-heading text-2xl font-semibold tracking-tight">Booklist</h1>
					<p className="text-sm text-muted-foreground">{club.name}</p>
				</div>
				{canContribute ? (
					<AddToBooklistDialog slug={club.slug} mode={club.canAddToBooklist ? "add" : "propose"} />
				) : null}
			</header>

			<Tabs defaultValue="list">
				<TabsList variant="line" className="w-full justify-start">
					<TabsTrigger value="list">
						Books
						{list.data?.total ? ` (${list.data.total})` : ""}
					</TabsTrigger>
					{club.canModerateBooklistProposals ? (
						<TabsTrigger value="proposals">
							Proposals
							{proposals.data?.items.length ? ` (${proposals.data.items.length})` : ""}
						</TabsTrigger>
					) : null}
				</TabsList>

				<TabsContent value="list">
					{list.isPending ? (
						<div className="flex justify-center py-10">
							<Loader2 className="size-5 animate-spin text-muted-foreground" />
						</div>
					) : list.isError ? (
						<p className="py-8 text-sm text-destructive">Failed to load booklist.</p>
					) : !list.data?.items.length ? (
						<p className="py-8 text-sm text-muted-foreground">
							No books yet.
							{canContribute
								? club.canAddToBooklist
									? " Add the first one."
									: " Propose a book to get started."
								: ""}
						</p>
					) : (
						<ul className="divide-y divide-border">
							{list.data.items.map((item) => (
								<li key={item.id} className="flex items-center gap-3 py-3">
									<Link
										href={`/books/${item.workId}`}
										className="flex min-w-0 flex-1 items-center gap-3"
									>
										<BookCover src={item.coverUrl} alt={item.title} size="sm" />
										<div className="min-w-0 flex-1">
											<p className="truncate font-medium">{item.title}</p>
											<p className="truncate text-xs text-muted-foreground">
												Added by @{item.addedBy.username}
											</p>
											<div className="mt-1 flex flex-wrap gap-1">
												{item.viewerReadingStatus ? (
													<Badge variant="secondary" className="font-normal">
														{readingLabel[item.viewerReadingStatus]}
													</Badge>
												) : null}
												{item.viewerHasFeedback ? (
													<Badge variant="outline" className="gap-1 font-normal">
														<Star className="size-3" aria-hidden />
														Reviewed
													</Badge>
												) : null}
											</div>
										</div>
									</Link>
									{club.canRemoveFromBooklist ? (
										<Button
											size="sm"
											variant="ghost"
											disabled={busy}
											onClick={() => {
												if (window.confirm(`Remove “${item.title}” from the booklist?`)) {
													remove.mutate(item.workId);
												}
											}}
										>
											Remove
										</Button>
									) : null}
								</li>
							))}
						</ul>
					)}
				</TabsContent>

				{club.canModerateBooklistProposals ? (
					<TabsContent value="proposals">
						{proposals.isPending ? (
							<div className="flex justify-center py-10">
								<Loader2 className="size-5 animate-spin text-muted-foreground" />
							</div>
						) : !proposals.data?.items.length ? (
							<p className="py-8 text-sm text-muted-foreground">No pending proposals.</p>
						) : (
							<ul className="divide-y divide-border">
								{proposals.data.items.map((item) => (
									<li key={item.id} className="flex items-center gap-3 py-3">
										<Link
											href={`/books/${item.workId}`}
											className="flex min-w-0 flex-1 items-center gap-3"
										>
											<BookCover src={item.coverUrl} alt={item.title} size="sm" />
											<div className="min-w-0">
												<p className="truncate font-medium">{item.title}</p>
												<p className="truncate text-xs text-muted-foreground">
													Proposed by @{item.addedBy.username}
												</p>
											</div>
										</Link>
										<div className="flex shrink-0 gap-2">
											<Button size="sm" disabled={busy} onClick={() => approve.mutate(item.workId)}>
												Approve
											</Button>
											<Button
												size="sm"
												variant="outline"
												disabled={busy}
												onClick={() => reject.mutate(item.workId)}
											>
												Reject
											</Button>
										</div>
									</li>
								))}
							</ul>
						)}
					</TabsContent>
				) : null}
			</Tabs>
		</section>
	);
}
