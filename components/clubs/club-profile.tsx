"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Lock, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ClubShareSheet } from "@/components/clubs/club-share-sheet";
import { ClubSubnav } from "@/components/clubs/club-subnav";
import { InviteMemberDialog } from "@/components/clubs/invite-member-dialog";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import type { ClubDetail } from "@/server/contracts";

const visibilityLabel: Record<ClubDetail["visibility"], string> = {
	public: "Public",
	private: "Private",
	invite_only: "Invite only",
};

interface ClubProfileProps {
	initial: ClubDetail;
}

export function ClubProfile({ initial }: ClubProfileProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { data: session } = authClient.useSession();

	const { data: club = initial } = useQuery({
		...orpc.club.getBySlug.queryOptions({ input: { slug: initial.slug } }),
		initialData: initial,
	});

	function invalidate() {
		void queryClient.invalidateQueries({ queryKey: orpc.club.key() });
		router.refresh();
	}

	const join = useMutation({
		...orpc.club.join.mutationOptions(),
		onSuccess: () => {
			toast.success("Joined club");
			invalidate();
		},
		onError: (error) => toast.error(error instanceof Error ? error.message : "Could not join"),
	});

	const requestJoin = useMutation({
		...orpc.club.requestJoin.mutationOptions(),
		onSuccess: () => {
			toast.success("Join request sent");
			invalidate();
		},
		onError: (error) => toast.error(error instanceof Error ? error.message : "Could not request"),
	});

	const cancelRequest = useMutation({
		...orpc.club.cancelRequest.mutationOptions(),
		onSuccess: () => {
			toast.success("Request cancelled");
			invalidate();
		},
		onError: (error) => toast.error(error instanceof Error ? error.message : "Could not cancel"),
	});

	const acceptInvite = useMutation({
		...orpc.club.acceptInvite.mutationOptions(),
		onSuccess: () => {
			toast.success("Invite accepted");
			invalidate();
		},
		onError: (error) => toast.error(error instanceof Error ? error.message : "Could not accept"),
	});

	const leave = useMutation({
		...orpc.club.leave.mutationOptions(),
		onSuccess: (data) => {
			toast.success(data.deleted ? "Club deleted (no members left)" : "Left club");
			invalidate();
			if (data.deleted) {
				router.push("/clubs");
			}
		},
		onError: (error) => toast.error(error instanceof Error ? error.message : "Could not leave"),
	});

	const busy =
		join.isPending ||
		requestJoin.isPending ||
		cancelRequest.isPending ||
		acceptInvite.isPending ||
		leave.isPending;

	const membership = club.membership;
	const isActive = membership?.status === "active";

	const showMembers = club.canViewContent;
	const showSettings = club.canManageSettings;

	return (
		<article className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
			{(showMembers || showSettings || club.canViewContent) && <ClubSubnav club={club} />}

			<header className="grid gap-4">
				<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
					<span>{visibilityLabel[club.visibility]}</span>
					{club.visibility !== "public" ? <Lock className="size-3" aria-hidden /> : null}
					<span>·</span>
					<span className="inline-flex items-center gap-1">
						<Users className="size-3" aria-hidden />
						{club.memberCount} {club.memberCount === 1 ? "member" : "members"}
					</span>
				</div>
				<div>
					<p className="font-mono text-sm text-muted-foreground">@{club.slug}</p>
					<h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
						{club.name}
					</h1>
				</div>
				{club.description ? (
					<p className="max-w-2xl text-muted-foreground text-pretty">{club.description}</p>
				) : (
					<p className="text-sm text-muted-foreground">No description yet.</p>
				)}

				<div className="flex flex-wrap gap-2">
					{!session?.user ? (
						<Button
							size="sm"
							nativeButton={false}
							render={<Link href="/login">Sign in to join</Link>}
						/>
					) : null}

					{session?.user && membership?.status === "invited" ? (
						<Button
							size="sm"
							disabled={busy}
							onClick={() => acceptInvite.mutate({ slug: club.slug })}
						>
							{busy ? <Loader2 className="size-4 animate-spin" /> : null}
							Accept invite
						</Button>
					) : null}

					{session?.user && !membership && club.visibility === "public" ? (
						<Button size="sm" disabled={busy} onClick={() => join.mutate({ slug: club.slug })}>
							Join
						</Button>
					) : null}

					{session?.user && !membership && club.visibility === "private" ? (
						<Button
							size="sm"
							disabled={busy}
							onClick={() => requestJoin.mutate({ slug: club.slug })}
						>
							Request to join
						</Button>
					) : null}

					{session?.user && membership?.status === "requested" ? (
						<Button
							size="sm"
							variant="outline"
							disabled={busy}
							onClick={() => cancelRequest.mutate({ slug: club.slug })}
						>
							Cancel request
						</Button>
					) : null}

					{isActive && club.canInvite && club.inviteCode ? (
						<>
							<InviteMemberDialog slug={club.slug} />
							<ClubShareSheet clubName={club.name} inviteCode={club.inviteCode} />
						</>
					) : null}

					{isActive ? (
						<Button
							size="sm"
							variant="ghost"
							disabled={busy}
							onClick={() => {
								if (window.confirm("Leave this club?")) {
									leave.mutate({ slug: club.slug });
								}
							}}
						>
							Leave
						</Button>
					) : null}
				</div>
			</header>

			{!club.canViewContent ? (
				<section className="border border-dashed border-border px-6 py-12 text-center">
					<p className="text-sm text-muted-foreground text-pretty">
						{club.visibility === "private"
							? "This club is private. Request to join or ask a member for an invite."
							: "Join this club to see the full profile and member list."}
					</p>
				</section>
			) : null}
		</article>
	);
}
