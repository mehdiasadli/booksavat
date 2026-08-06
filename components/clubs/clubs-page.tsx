"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { ClubCard } from "@/components/clubs/club-card";
import { CreateClubDialog } from "@/components/clubs/create-club-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";

export function ClubsPage() {
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const queryClient = useQueryClient();
	const signedIn = Boolean(session?.user);

	const mine = useQuery({
		...orpc.club.listMine.queryOptions({ input: { limit: 50, offset: 0 } }),
		enabled: signedIn,
	});

	const explore = useQuery({
		...orpc.club.listPublic.queryOptions({ input: { limit: 50, offset: 0 } }),
	});

	const invites = useQuery({
		...orpc.club.listInvites.queryOptions(),
		enabled: signedIn,
	});

	const acceptInvite = useMutation({
		...orpc.club.acceptInvite.mutationOptions(),
		onSuccess: (club) => {
			void queryClient.invalidateQueries({ queryKey: orpc.club.key() });
			toast.success(`Joined ${club.name}`);
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not accept invite");
		},
	});

	const declineInvite = useMutation({
		...orpc.club.declineInvite.mutationOptions(),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: orpc.club.key() });
			toast.success("Invite declined");
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not decline invite");
		},
	});

	if (sessionPending) {
		return (
			<div className="flex justify-center py-16">
				<Loader2 className="size-5 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<section className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10 sm:px-6">
			<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div className="grid gap-2">
					<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Clubs</p>
					<h1 className="font-heading text-3xl font-semibold tracking-tight">Reading clubs</h1>
					<p className="text-sm text-muted-foreground text-pretty">
						Create a club, invite friends, and manage membership. Booklists and sessions come next.
					</p>
				</div>
				{signedIn ? <CreateClubDialog /> : null}
			</header>

			{!signedIn ? (
				<div className="grid gap-3 border border-dashed border-border px-6 py-10 text-center">
					<p className="text-sm text-muted-foreground">Sign in to create clubs and see invites.</p>
					<div className="flex justify-center">
						<Button nativeButton={false} render={<Link href="/login">Sign in</Link>} />
					</div>
				</div>
			) : null}

			{signedIn && invites.data?.items.length ? (
				<section className="grid gap-3">
					<h2 className="font-heading text-lg font-semibold tracking-tight">Invites</h2>
					<ul className="divide-y divide-border">
						{invites.data.items.map((invite) => (
							<li key={invite.membershipId} className="flex items-center gap-3 py-3">
								<div className="min-w-0 flex-1">
									<p className="truncate font-medium">{invite.club.name}</p>
									<p className="truncate text-sm text-muted-foreground">@{invite.club.slug}</p>
								</div>
								<div className="flex shrink-0 gap-2">
									<Button
										size="sm"
										disabled={acceptInvite.isPending || declineInvite.isPending}
										onClick={() => acceptInvite.mutate({ slug: invite.club.slug })}
									>
										Accept
									</Button>
									<Button
										size="sm"
										variant="outline"
										disabled={acceptInvite.isPending || declineInvite.isPending}
										onClick={() => declineInvite.mutate({ slug: invite.club.slug })}
									>
										Decline
									</Button>
								</div>
							</li>
						))}
					</ul>
				</section>
			) : null}

			<Tabs defaultValue={signedIn ? "mine" : "explore"}>
				<TabsList variant="line" className="w-full justify-start">
					{signedIn ? <TabsTrigger value="mine">My clubs</TabsTrigger> : null}
					<TabsTrigger value="explore">Explore</TabsTrigger>
				</TabsList>

				{signedIn ? (
					<TabsContent value="mine">
						{mine.isPending ? (
							<div className="flex justify-center py-10">
								<Loader2 className="size-5 animate-spin text-muted-foreground" />
							</div>
						) : mine.isError ? (
							<p className="py-8 text-sm text-destructive">Failed to load your clubs.</p>
						) : !mine.data?.items.length ? (
							<p className="py-8 text-sm text-muted-foreground">
								You’re not in any clubs yet. Create one or join from Explore.
							</p>
						) : (
							<div>
								{mine.data.items.map((club) => (
									<ClubCard key={club.id} club={club} />
								))}
							</div>
						)}
					</TabsContent>
				) : null}

				<TabsContent value="explore">
					{explore.isPending ? (
						<div className="flex justify-center py-10">
							<Loader2 className="size-5 animate-spin text-muted-foreground" />
						</div>
					) : explore.isError ? (
						<p className="py-8 text-sm text-destructive">Failed to load public clubs.</p>
					) : !explore.data?.items.length ? (
						<p className="py-8 text-sm text-muted-foreground">No public clubs yet.</p>
					) : (
						<div>
							{explore.data.items.map((club) => (
								<ClubCard key={club.id} club={club} />
							))}
						</div>
					)}
				</TabsContent>
			</Tabs>
		</section>
	);
}
