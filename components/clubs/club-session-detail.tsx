"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { z } from "zod";

import { ClubSubnav } from "@/components/clubs/club-subnav";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { authClient } from "@/lib/auth-client";
import { client, orpc } from "@/lib/orpc";
import type { ClubDetail } from "@/server/contracts";
import type { readingSessionDetailSchema } from "@/server/contracts/club.contract";

type SessionDetail = z.infer<typeof readingSessionDetailSchema>;

const statusLabel: Record<string, string> = {
	proposed: "Proposed",
	voting: "Voting",
	pending: "Pending",
	reading: "Reading",
	reviewing: "Reviewing",
	completed: "Completed",
	cancelled: "Cancelled",
	abandoned: "Abandoned",
};

const nextLabel: Record<string, string> = {
	proposed: "Open voting",
	voting: "Close voting → pending",
	pending: "Start reading",
	reading: "Open reviewing",
	reviewing: "Mark completed",
};

interface ClubSessionDetailProps {
	club: ClubDetail;
	initial: SessionDetail;
}

export function ClubSessionDetail({ club: initialClub, initial }: ClubSessionDetailProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { data: authSession } = authClient.useSession();
	const viewerUserId = authSession?.user.id;

	const [addWorkId, setAddWorkId] = useState<string | null>(null);
	const [tieBreakWorkId, setTieBreakWorkId] = useState<string | null>(null);
	const [chipPicks, setChipPicks] = useState<Record<number, string>>({});

	const { data: club = initialClub } = useQuery({
		...orpc.club.getBySlug.queryOptions({ input: { slug: initialClub.slug } }),
		initialData: initialClub,
	});

	const { data: session = initial } = useQuery({
		...orpc.club.getReadingSession.queryOptions({
			input: { slug: club.slug, sessionId: initial.id },
		}),
		initialData: initial,
	});

	const booklist = useQuery({
		...orpc.club.listBooklist.queryOptions({
			input: { slug: club.slug, limit: 100, offset: 0 },
		}),
		enabled: session.voting.canManageShortlist,
	});

	const shortlistIds = useMemo(
		() => new Set(session.voting.shortlist.map((item) => item.workId)),
		[session.voting.shortlist],
	);

	const addableBooks = (booklist.data?.items ?? []).filter(
		(item) => !shortlistIds.has(item.workId),
	);

	const addableSelectItems = useMemo(
		() => addableBooks.map((item) => ({ value: item.workId, label: item.title })),
		[addableBooks],
	);

	const leadingSelectItems = useMemo(
		() =>
			session.voting.shortlist
				.filter((item) => session.voting.leadingWorkIds.includes(item.workId))
				.map((item) => ({
					value: item.workId,
					label: `${item.title} (${item.score} pts)`,
				})),
		[session.voting.shortlist, session.voting.leadingWorkIds],
	);

	const chipByWorkId = useMemo(() => {
		const map = new Map<string, number>();
		for (const [points, workId] of Object.entries(chipPicks)) {
			if (workId) map.set(workId, Number(points));
		}
		return map;
	}, [chipPicks]);

	function assignChipToBook(points: number, workId: string) {
		setChipPicks((prev) => {
			const next: Record<number, string> = { ...prev };
			const alreadyOnThisBook = prev[points] === workId;

			for (const [chip, assignedWorkId] of Object.entries(next)) {
				if (assignedWorkId === workId) {
					delete next[Number(chip)];
				}
			}

			if (!alreadyOnThisBook) {
				next[points] = workId;
			}

			return next;
		});
	}

	useEffect(() => {
		const next: Record<number, string> = {};
		for (const assignment of session.voting.viewerAssignments) {
			next[assignment.points] = assignment.workId;
		}
		setChipPicks(next);
		if (session.voting.leadingWorkIds.length === 1) {
			setTieBreakWorkId(session.voting.leadingWorkIds[0] ?? null);
		} else if (
			session.selectedWorkId &&
			session.voting.leadingWorkIds.includes(session.selectedWorkId)
		) {
			setTieBreakWorkId(session.selectedWorkId);
		} else {
			setTieBreakWorkId(null);
		}
	}, [session.voting.viewerAssignments, session.voting.leadingWorkIds, session.selectedWorkId]);

	function invalidate() {
		void queryClient.invalidateQueries({ queryKey: orpc.club.key() });
		router.refresh();
	}

	const join = useMutation({
		...orpc.club.joinReadingSession.mutationOptions(),
		onSuccess: () => {
			toast.success("Joined session");
			invalidate();
		},
		onError: (error) => toast.error(error instanceof Error ? error.message : "Could not join"),
	});

	const leave = useMutation({
		...orpc.club.leaveReadingSession.mutationOptions(),
		onSuccess: () => {
			toast.success("Left session");
			invalidate();
		},
		onError: (error) => toast.error(error instanceof Error ? error.message : "Could not leave"),
	});

	const advance = useMutation({
		mutationFn: () =>
			client.club.advanceReadingSession({
				slug: club.slug,
				sessionId: session.id,
				selectedWorkId:
					session.status === "voting" && session.voting.leadingWorkIds.length !== 1
						? tieBreakWorkId || undefined
						: undefined,
			}),
		onSuccess: (next) => {
			toast.success(`Moved to ${statusLabel[next.status] ?? next.status}`);
			invalidate();
		},
		onError: (error) => toast.error(error instanceof Error ? error.message : "Could not advance"),
	});

	const cancel = useMutation({
		...orpc.club.cancelReadingSession.mutationOptions(),
		onSuccess: () => {
			toast.success("Session cancelled");
			invalidate();
		},
		onError: (error) => toast.error(error instanceof Error ? error.message : "Could not cancel"),
	});

	const abandon = useMutation({
		...orpc.club.abandonReadingSession.mutationOptions(),
		onSuccess: () => {
			toast.success("Session abandoned");
			invalidate();
		},
		onError: (error) => toast.error(error instanceof Error ? error.message : "Could not abandon"),
	});

	const addShortlist = useMutation({
		mutationFn: (workId: string) =>
			client.club.addSessionShortlistItem({
				slug: club.slug,
				sessionId: session.id,
				workId,
			}),
		onSuccess: () => {
			toast.success("Added to shortlist");
			setAddWorkId(null);
			invalidate();
		},
		onError: (error) => toast.error(error instanceof Error ? error.message : "Could not add"),
	});

	const removeShortlist = useMutation({
		mutationFn: (workId: string) =>
			client.club.removeSessionShortlistItem({
				slug: club.slug,
				sessionId: session.id,
				workId,
			}),
		onSuccess: () => {
			toast.success("Removed from shortlist");
			invalidate();
		},
		onError: (error) => toast.error(error instanceof Error ? error.message : "Could not remove"),
	});

	const fillRandom = useMutation({
		mutationFn: () =>
			client.club.fillRandomSessionShortlist({
				slug: club.slug,
				sessionId: session.id,
				size: club.booklistSettings.defaultShortlistSize,
			}),
		onSuccess: () => {
			toast.success("Filled shortlist");
			invalidate();
		},
		onError: (error) => toast.error(error instanceof Error ? error.message : "Could not fill"),
	});

	const castVotes = useMutation({
		mutationFn: () => {
			const assignments = session.voting.viewerChips.map((points) => ({
				points,
				workId: chipPicks[points] ?? "",
			}));
			return client.club.castSessionVotes({
				slug: club.slug,
				sessionId: session.id,
				assignments,
			});
		},
		onSuccess: () => {
			toast.success("Votes saved");
			invalidate();
		},
		onError: (error) => toast.error(error instanceof Error ? error.message : "Could not vote"),
	});

	const setBlocked = useMutation({
		mutationFn: ({ userId, voteBlocked }: { userId: string; voteBlocked: boolean }) =>
			client.club.setSessionVoteBlocked({
				slug: club.slug,
				sessionId: session.id,
				userId,
				voteBlocked,
			}),
		onSuccess: () => {
			toast.success("Blocklist updated");
			invalidate();
		},
		onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update"),
	});

	const busy =
		join.isPending ||
		leave.isPending ||
		advance.isPending ||
		cancel.isPending ||
		abandon.isPending ||
		addShortlist.isPending ||
		removeShortlist.isPending ||
		fillRandom.isPending ||
		castVotes.isPending ||
		setBlocked.isPending;

	const voteReady =
		session.voting.viewerChips.length > 0 &&
		session.voting.viewerChips.every((points) => Boolean(chipPicks[points]));

	const needsTieBreak = session.status === "voting" && session.voting.leadingWorkIds.length !== 1;
	const advanceDisabled =
		busy ||
		(session.status === "proposed" && session.voting.shortlist.length < 2) ||
		(session.status === "voting" && needsTieBreak && !tieBreakWorkId);

	const blocklistParticipants = session.voting.participants.filter(
		(participant) => participant.userId !== viewerUserId,
	);

	return (
		<section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
			<ClubSubnav
				slug={club.slug}
				showBooklist={club.canViewContent}
				showSessions={club.canViewContent}
				showMembers={club.canViewContent}
				showSettings={club.canManageSettings}
			/>

			<header className="grid gap-3">
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant="secondary">{statusLabel[session.status] ?? session.status}</Badge>
					<span className="text-xs text-muted-foreground">
						{session.participantCount}{" "}
						{session.participantCount === 1 ? "participant" : "participants"}
					</span>
				</div>
				<h1 className="font-heading text-2xl font-semibold tracking-tight">
					{session.title?.trim() || "Reading session"}
				</h1>
				<p className="text-sm text-muted-foreground">Created by @{session.createdBy.username}</p>
			</header>

			<dl className="grid gap-3 text-sm sm:grid-cols-2">
				<div>
					<dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
						Join deadline
					</dt>
					<dd>{session.joinDeadline.toLocaleString()}</dd>
				</div>
				<div>
					<dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
						Reading deadline
					</dt>
					<dd>{session.readingDeadline ? session.readingDeadline.toLocaleString() : "Not set"}</dd>
				</div>
				<div className="sm:col-span-2">
					<dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
						Selected book
					</dt>
					<dd>
						{session.selectedWorkId ? (
							<Link
								href={`/books/${session.selectedWorkId}`}
								className="text-foreground underline-offset-4 hover:underline"
							>
								{session.voting.shortlist.find((item) => item.workId === session.selectedWorkId)
									?.title ?? session.selectedWorkId}
							</Link>
						) : (
							<span className="text-muted-foreground">Not chosen yet</span>
						)}
					</dd>
				</div>
			</dl>

			{(session.status === "proposed" || session.status === "voting") && (
				<section className="grid gap-3 rounded-lg border border-border p-4">
					<div className="flex flex-wrap items-end justify-between gap-2">
						<div>
							<h2 className="font-heading text-lg font-semibold tracking-tight">Shortlist</h2>
							<p className="text-sm text-muted-foreground">
								{session.status === "proposed"
									? "Add at least two books before opening voting."
									: "Locked for voting. Scores update as ballots land."}
							</p>
						</div>
						{session.voting.canManageShortlist ? (
							<Button
								size="sm"
								variant="outline"
								disabled={busy}
								onClick={() => fillRandom.mutate()}
							>
								Fill random ({club.booklistSettings.defaultShortlistSize})
							</Button>
						) : null}
					</div>

					<ul className="grid gap-2">
						{session.voting.shortlist.length === 0 ? (
							<li className="text-sm text-muted-foreground">No books shortlisted yet.</li>
						) : (
							session.voting.shortlist.map((item) => (
								<li
									key={item.workId}
									className="flex flex-wrap items-center justify-between gap-2 text-sm"
								>
									<div className="min-w-0">
										<Link
											href={`/books/${item.workId}`}
											className="font-medium underline-offset-4 hover:underline"
										>
											{item.title}
										</Link>
										{session.status === "voting" ? (
											<span className="ml-2 text-muted-foreground">{item.score} pts</span>
										) : null}
										{session.voting.leadingWorkIds.includes(item.workId) &&
										session.status === "voting" ? (
											<Badge variant="outline" className="ml-2">
												Leading
											</Badge>
										) : null}
									</div>
									{session.voting.canManageShortlist ? (
										<Button
											size="sm"
											variant="ghost"
											disabled={busy}
											onClick={() => removeShortlist.mutate(item.workId)}
										>
											Remove
										</Button>
									) : null}
								</li>
							))
						)}
					</ul>

					{session.voting.canManageShortlist ? (
						<div className="grid gap-2 border-t border-border pt-3">
							<Label htmlFor="add-shortlist">Add from booklist</Label>
							<div className="flex flex-wrap gap-2">
								<Select
									items={addableSelectItems}
									value={addWorkId}
									onValueChange={(value) => setAddWorkId(value)}
									disabled={busy || addableBooks.length === 0}
								>
									<SelectTrigger id="add-shortlist" className="min-w-0 flex-1">
										<SelectValue placeholder="Select a book…" />
									</SelectTrigger>
									<SelectContent>
										{addableSelectItems.map((item) => (
											<SelectItem key={item.value} value={item.value}>
												{item.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Button
									size="sm"
									disabled={busy || !addWorkId}
									onClick={() => {
										if (addWorkId) addShortlist.mutate(addWorkId);
									}}
								>
									Add
								</Button>
							</div>
						</div>
					) : null}
				</section>
			)}

			{session.status === "voting" ? (
				<section className="grid gap-3 rounded-lg border border-border p-4">
					<div>
						<h2 className="font-heading text-lg font-semibold tracking-tight">Your ballot</h2>
						<p className="text-sm text-muted-foreground">
							Use each point chip once, each on a different shortlisted book.
						</p>
					</div>

					{!session.viewerJoined ? (
						<p className="text-sm text-muted-foreground">Join the session to vote.</p>
					) : !session.voting.canVote ? (
						<p className="text-sm text-muted-foreground">
							You cannot vote in this session (blocked or not eligible).
						</p>
					) : (
						<div className="grid gap-3">
							<p className="text-xs text-muted-foreground">
								Tap a point chip on a book. Each chip can sit on only one book; assigning it again
								moves it.
							</p>
							<ul className="grid gap-2">
								{session.voting.shortlist.map((item) => {
									const assignedChip = chipByWorkId.get(item.workId);
									return (
										<li
											key={item.workId}
											className="flex flex-col gap-2 rounded-md border border-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
										>
											<div className="min-w-0">
												<p className="truncate text-sm font-medium">{item.title}</p>
												<p className="text-xs text-muted-foreground">{item.score} pts total</p>
											</div>
											<div className="flex flex-wrap gap-1.5">
												{session.voting.viewerChips.map((points) => {
													const isActive = assignedChip === points;
													const usedElsewhere =
														Boolean(chipPicks[points]) && chipPicks[points] !== item.workId;
													return (
														<Button
															key={points}
															type="button"
															size="sm"
															variant={isActive ? "default" : "outline"}
															disabled={busy}
															aria-pressed={isActive}
															title={
																usedElsewhere
																	? `Move ${points} pts here`
																	: isActive
																		? `Clear ${points} pts`
																		: `Assign ${points} pts`
															}
															onClick={() => assignChipToBook(points, item.workId)}
														>
															{points}
															{usedElsewhere ? (
																<span className="text-[0.65rem] opacity-70">→</span>
															) : null}
														</Button>
													);
												})}
											</div>
										</li>
									);
								})}
							</ul>
							<div className="flex flex-wrap items-center gap-2">
								<p className="text-xs text-muted-foreground">
									{session.voting.viewerChips.filter((points) => chipPicks[points]).length}/
									{session.voting.viewerChips.length} chips placed
								</p>
								<Button size="sm" disabled={busy || !voteReady} onClick={() => castVotes.mutate()}>
									{castVotes.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
									Save votes
								</Button>
							</div>
						</div>
					)}

					{session.canAdvance && needsTieBreak ? (
						<div className="grid gap-2 border-t border-border pt-3">
							<Label htmlFor="tie-break">Tie-break pick</Label>
							<Select
								items={leadingSelectItems}
								value={tieBreakWorkId}
								onValueChange={(value) => setTieBreakWorkId(value)}
								disabled={busy}
							>
								<SelectTrigger id="tie-break" className="w-full">
									<SelectValue placeholder="Pick a leading book…" />
								</SelectTrigger>
								<SelectContent>
									{leadingSelectItems.map((item) => (
										<SelectItem key={item.value} value={item.value}>
											{item.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					) : null}
				</section>
			) : null}

			{session.voting.canManageBlocklist && blocklistParticipants.length > 0 ? (
				<section className="grid gap-3 rounded-lg border border-border p-4">
					<div>
						<h2 className="font-heading text-lg font-semibold tracking-tight">Vote blocklist</h2>
						<p className="text-sm text-muted-foreground">
							Blocked participants cannot cast ballots. Existing votes are cleared.
						</p>
					</div>
					<ul className="grid gap-2">
						{blocklistParticipants.map((participant) => (
							<li
								key={participant.userId}
								className="flex flex-wrap items-center justify-between gap-2 text-sm"
							>
								<span>
									@{participant.username}
									{participant.hasVoted ? (
										<span className="ml-2 text-muted-foreground">voted</span>
									) : null}
									{participant.voteBlocked ? (
										<Badge variant="outline" className="ml-2">
											Blocked
										</Badge>
									) : null}
								</span>
								<Button
									size="sm"
									variant="outline"
									disabled={busy}
									onClick={() =>
										setBlocked.mutate({
											userId: participant.userId,
											voteBlocked: !participant.voteBlocked,
										})
									}
								>
									{participant.voteBlocked ? "Unblock" : "Block"}
								</Button>
							</li>
						))}
					</ul>
				</section>
			) : null}

			<div className="flex flex-wrap gap-2">
				{session.canJoin ? (
					<Button
						size="sm"
						disabled={busy}
						onClick={() => join.mutate({ slug: club.slug, sessionId: session.id })}
					>
						{join.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
						Join session
					</Button>
				) : null}
				{session.canLeave ? (
					<Button
						size="sm"
						variant="outline"
						disabled={busy}
						onClick={() => leave.mutate({ slug: club.slug, sessionId: session.id })}
					>
						Leave
					</Button>
				) : null}
				{session.canAdvance ? (
					<Button size="sm" disabled={advanceDisabled} onClick={() => advance.mutate()}>
						{nextLabel[session.status] ?? "Advance"}
					</Button>
				) : null}
				{session.canCancel ? (
					<AlertDialog>
						<AlertDialogTrigger render={<Button size="sm" variant="outline" disabled={busy} />}>
							Cancel
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Cancel this session?</AlertDialogTitle>
								<AlertDialogDescription>
									This ends the session as cancelled. Participants keep their join history, but
									stages cannot continue.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Keep session</AlertDialogCancel>
								<AlertDialogAction
									variant="destructive"
									disabled={cancel.isPending}
									onClick={() => cancel.mutate({ slug: club.slug, sessionId: session.id })}
								>
									{cancel.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
									Cancel session
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				) : null}
				{session.canAbandon ? (
					<AlertDialog>
						<AlertDialogTrigger render={<Button size="sm" variant="destructive" disabled={busy} />}>
							Abandon
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Abandon this reading session?</AlertDialogTitle>
								<AlertDialogDescription>
									This marks the session abandoned. You can’t reopen it afterward.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Keep reading</AlertDialogCancel>
								<AlertDialogAction
									variant="destructive"
									disabled={abandon.isPending}
									onClick={() => abandon.mutate({ slug: club.slug, sessionId: session.id })}
								>
									{abandon.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
									Abandon session
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				) : null}
				<Button
					size="sm"
					variant="ghost"
					nativeButton={false}
					render={<Link href={`/clubs/${club.slug}/sessions`}>All sessions</Link>}
				/>
			</div>
		</section>
	);
}
