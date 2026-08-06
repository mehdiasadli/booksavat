"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { z } from "zod";

import { ClubSubnav } from "@/components/clubs/club-subnav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
	const [addWorkId, setAddWorkId] = useState("");
	const [tieBreakWorkId, setTieBreakWorkId] = useState("");
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

	useEffect(() => {
		const next: Record<number, string> = {};
		for (const assignment of session.voting.viewerAssignments) {
			next[assignment.points] = assignment.workId;
		}
		setChipPicks(next);
		if (session.voting.leadingWorkIds.length === 1) {
			setTieBreakWorkId(session.voting.leadingWorkIds[0] ?? "");
		} else if (
			session.selectedWorkId &&
			session.voting.leadingWorkIds.includes(session.selectedWorkId)
		) {
			setTieBreakWorkId(session.selectedWorkId);
		} else {
			setTieBreakWorkId("");
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
			setAddWorkId("");
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
								{session.selectedWorkId}
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
								<select
									id="add-shortlist"
									value={addWorkId}
									onChange={(event) => setAddWorkId(event.target.value)}
									className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"
								>
									<option value="">Select a book…</option>
									{addableBooks.map((item) => (
										<option key={item.id} value={item.workId}>
											{item.title}
										</option>
									))}
								</select>
								<Button
									size="sm"
									disabled={busy || !addWorkId}
									onClick={() => addShortlist.mutate(addWorkId)}
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
							{session.voting.viewerChips.map((points) => (
								<div key={points} className="grid gap-1.5 sm:grid-cols-[4rem_1fr] sm:items-center">
									<Label htmlFor={`chip-${points}`}>{points} pts</Label>
									<select
										id={`chip-${points}`}
										value={chipPicks[points] ?? ""}
										onChange={(event) =>
											setChipPicks((prev) => ({ ...prev, [points]: event.target.value }))
										}
										className="h-9 rounded-md border bg-background px-3 text-sm"
									>
										<option value="">Choose a book…</option>
										{session.voting.shortlist.map((item) => (
											<option key={item.workId} value={item.workId}>
												{item.title}
											</option>
										))}
									</select>
								</div>
							))}
							<Button size="sm" disabled={busy || !voteReady} onClick={() => castVotes.mutate()}>
								{castVotes.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
								Save votes
							</Button>
						</div>
					)}

					{session.canAdvance && needsTieBreak ? (
						<div className="grid gap-2 border-t border-border pt-3">
							<Label htmlFor="tie-break">Tie-break pick</Label>
							<select
								id="tie-break"
								value={tieBreakWorkId}
								onChange={(event) => setTieBreakWorkId(event.target.value)}
								className="h-9 rounded-md border bg-background px-3 text-sm"
							>
								<option value="">Pick a leading book…</option>
								{session.voting.shortlist
									.filter((item) => session.voting.leadingWorkIds.includes(item.workId))
									.map((item) => (
										<option key={item.workId} value={item.workId}>
											{item.title} ({item.score} pts)
										</option>
									))}
							</select>
						</div>
					) : null}
				</section>
			) : null}

			{session.voting.canManageBlocklist && session.voting.participants.length > 0 ? (
				<section className="grid gap-3 rounded-lg border border-border p-4">
					<div>
						<h2 className="font-heading text-lg font-semibold tracking-tight">Vote blocklist</h2>
						<p className="text-sm text-muted-foreground">
							Blocked participants cannot cast ballots. Existing votes are cleared.
						</p>
					</div>
					<ul className="grid gap-2">
						{session.voting.participants.map((participant) => (
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
					<Button
						size="sm"
						variant="outline"
						disabled={busy}
						onClick={() => {
							if (window.confirm("Cancel this session?")) {
								cancel.mutate({ slug: club.slug, sessionId: session.id });
							}
						}}
					>
						Cancel
					</Button>
				) : null}
				{session.canAbandon ? (
					<Button
						size="sm"
						variant="destructive"
						disabled={busy}
						onClick={() => {
							if (window.confirm("Abandon this reading session?")) {
								abandon.mutate({ slug: club.slug, sessionId: session.id });
							}
						}}
					>
						Abandon
					</Button>
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
