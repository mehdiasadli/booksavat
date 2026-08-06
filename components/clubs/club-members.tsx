"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ClubSubnav } from "@/components/clubs/club-subnav";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/users/user-avatar";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import type { ClubDetail } from "@/server/contracts";

const roleLabel: Record<"admin" | "moderator" | "member", string> = {
	admin: "Admin",
	moderator: "Moderator",
	member: "Member",
};

interface ClubMembersProps {
	initial: ClubDetail;
}

export function ClubMembers({ initial }: ClubMembersProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { data: session } = authClient.useSession();

	const { data: club = initial } = useQuery({
		...orpc.club.getBySlug.queryOptions({ input: { slug: initial.slug } }),
		initialData: initial,
	});

	const members = useQuery({
		...orpc.club.listMembers.queryOptions({
			input: { slug: club.slug, limit: 100, offset: 0 },
		}),
		enabled: club.canViewContent,
	});

	const requests = useQuery({
		...orpc.club.listRequests.queryOptions({ input: { slug: club.slug } }),
		enabled: club.canModerateRequests,
	});

	function invalidate() {
		void queryClient.invalidateQueries({ queryKey: orpc.club.key() });
		router.refresh();
	}

	const acceptRequest = useMutation({
		...orpc.club.acceptRequest.mutationOptions(),
		onSuccess: () => {
			toast.success("Request accepted");
			invalidate();
		},
		onError: (error) => toast.error(error instanceof Error ? error.message : "Could not accept"),
	});

	const rejectRequest = useMutation({
		...orpc.club.rejectRequest.mutationOptions(),
		onSuccess: () => {
			toast.success("Request rejected");
			invalidate();
		},
		onError: (error) => toast.error(error instanceof Error ? error.message : "Could not reject"),
	});

	const setRole = useMutation({
		...orpc.club.setRole.mutationOptions(),
		onSuccess: () => {
			toast.success("Role updated");
			invalidate();
		},
		onError: (error) =>
			toast.error(error instanceof Error ? error.message : "Could not update role"),
	});

	const removeMember = useMutation({
		...orpc.club.removeMember.mutationOptions(),
		onSuccess: () => {
			toast.success("Member removed");
			invalidate();
		},
		onError: (error) => toast.error(error instanceof Error ? error.message : "Could not remove"),
	});

	const transferAdmin = useMutation({
		...orpc.club.transferAdmin.mutationOptions(),
		onSuccess: () => {
			toast.success("Admin transferred");
			invalidate();
		},
		onError: (error) =>
			toast.error(error instanceof Error ? error.message : "Could not transfer admin"),
	});

	if (!club.canViewContent) {
		return (
			<section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
				<p className="text-sm text-muted-foreground">You can’t view members of this club.</p>
				<Button
					size="sm"
					nativeButton={false}
					render={<Link href={`/clubs/${club.slug}`}>Back</Link>}
				/>
			</section>
		);
	}

	const viewerIsAdmin = club.membership?.role === "admin" && club.membership.status === "active";
	const viewerIsMod = club.membership?.role === "moderator" && club.membership.status === "active";
	const busy =
		setRole.isPending ||
		removeMember.isPending ||
		transferAdmin.isPending ||
		acceptRequest.isPending ||
		rejectRequest.isPending;

	return (
		<section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
			<ClubSubnav
				slug={club.slug}
				showBooklist={club.canViewContent}
				showMembers
				showSettings={club.canManageSettings}
			/>

			<header className="grid gap-1">
				<h1 className="font-heading text-2xl font-semibold tracking-tight">Members</h1>
				<p className="text-sm text-muted-foreground">{club.name}</p>
			</header>

			<Tabs defaultValue="members">
				<TabsList variant="line" className="w-full justify-start">
					<TabsTrigger value="members">Members</TabsTrigger>
					{club.canModerateRequests ? (
						<TabsTrigger value="requests">
							Requests
							{requests.data?.items.length ? ` (${requests.data.items.length})` : ""}
						</TabsTrigger>
					) : null}
				</TabsList>

				<TabsContent value="members">
					{members.isPending ? (
						<div className="flex justify-center py-10">
							<Loader2 className="size-5 animate-spin text-muted-foreground" />
						</div>
					) : members.isError ? (
						<p className="py-8 text-sm text-destructive">Failed to load members.</p>
					) : !members.data?.items.length ? (
						<p className="py-8 text-sm text-muted-foreground">No members yet.</p>
					) : (
						<ul className="divide-y divide-border">
							{members.data.items.map((member) => {
								const isSelf = session?.user?.id === member.userId;
								const canManageThis =
									(viewerIsAdmin && !isSelf) ||
									(viewerIsMod && member.role === "member" && !isSelf);

								return (
									<li key={member.id} className="flex items-center gap-3 py-3">
										<Link
											href={`/users/${member.user.username}`}
											className="flex min-w-0 flex-1 items-center gap-3"
										>
											<UserAvatar name={member.user.name} image={member.user.image} size="md" />
											<div className="min-w-0">
												<p className="truncate font-medium">{member.user.name}</p>
												<p className="truncate text-sm text-muted-foreground">
													@{member.user.username}
												</p>
											</div>
										</Link>
										<span className="shrink-0 text-xs text-muted-foreground">
											{roleLabel[member.role]}
										</span>
										{canManageThis ? (
											<DropdownMenu>
												<DropdownMenuTrigger
													render={
														<Button size="icon-sm" variant="ghost" aria-label="Member actions">
															<MoreHorizontal className="size-4" />
														</Button>
													}
												/>
												<DropdownMenuContent align="end">
													{viewerIsAdmin && member.role === "member" ? (
														<DropdownMenuItem
															disabled={busy}
															onClick={() =>
																setRole.mutate({
																	slug: club.slug,
																	username: member.user.username,
																	role: "moderator",
																})
															}
														>
															Make moderator
														</DropdownMenuItem>
													) : null}
													{viewerIsAdmin && member.role === "moderator" ? (
														<DropdownMenuItem
															disabled={busy}
															onClick={() =>
																setRole.mutate({
																	slug: club.slug,
																	username: member.user.username,
																	role: "member",
																})
															}
														>
															Demote to member
														</DropdownMenuItem>
													) : null}
													{viewerIsAdmin && member.role !== "admin" ? (
														<DropdownMenuItem
															disabled={busy}
															onClick={() => {
																if (
																	window.confirm(
																		`Transfer admin to @${member.user.username}? You will become a moderator.`,
																	)
																) {
																	transferAdmin.mutate({
																		slug: club.slug,
																		username: member.user.username,
																	});
																}
															}}
														>
															Transfer admin
														</DropdownMenuItem>
													) : null}
													{canManageThis ? (
														<>
															<DropdownMenuSeparator />
															<DropdownMenuItem
																variant="destructive"
																disabled={busy}
																onClick={() => {
																	if (
																		window.confirm(`Remove @${member.user.username} from the club?`)
																	) {
																		removeMember.mutate({
																			slug: club.slug,
																			username: member.user.username,
																		});
																	}
																}}
															>
																Remove
															</DropdownMenuItem>
														</>
													) : null}
												</DropdownMenuContent>
											</DropdownMenu>
										) : null}
									</li>
								);
							})}
						</ul>
					)}
				</TabsContent>

				{club.canModerateRequests ? (
					<TabsContent value="requests">
						{requests.isPending ? (
							<div className="flex justify-center py-10">
								<Loader2 className="size-5 animate-spin text-muted-foreground" />
							</div>
						) : !requests.data?.items.length ? (
							<p className="py-8 text-sm text-muted-foreground">No pending requests.</p>
						) : (
							<ul className="divide-y divide-border">
								{requests.data.items.map((req) => (
									<li key={req.id} className="flex items-center gap-3 py-3">
										<Link
											href={`/users/${req.user.username}`}
											className="flex min-w-0 flex-1 items-center gap-3"
										>
											<UserAvatar name={req.user.name} image={req.user.image} size="md" />
											<div className="min-w-0">
												<p className="truncate font-medium">{req.user.name}</p>
												<p className="truncate text-sm text-muted-foreground">
													@{req.user.username}
												</p>
											</div>
										</Link>
										<div className="flex shrink-0 gap-2">
											<Button
												size="sm"
												disabled={busy}
												onClick={() =>
													acceptRequest.mutate({
														slug: club.slug,
														username: req.user.username,
													})
												}
											>
												Accept
											</Button>
											<Button
												size="sm"
												variant="outline"
												disabled={busy}
												onClick={() =>
													rejectRequest.mutate({
														slug: club.slug,
														username: req.user.username,
													})
												}
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
