"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
	voting: "Confirm book → pending",
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
	const [selectedWorkId, setSelectedWorkId] = useState(initial.selectedWorkId ?? "");

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
		enabled: session.status === "voting" && session.canAdvance,
	});

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
				selectedWorkId: session.status === "voting" ? selectedWorkId || undefined : undefined,
			}),
		onSuccess: (next) => {
			toast.success(`Moved to ${statusLabel[next.status] ?? next.status}`);
			if (next.selectedWorkId) setSelectedWorkId(next.selectedWorkId);
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

	const busy =
		join.isPending || leave.isPending || advance.isPending || cancel.isPending || abandon.isPending;

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

			{session.status === "voting" && session.canAdvance ? (
				<div className="grid gap-2 rounded-lg border border-border p-4">
					<Label htmlFor="pick-work">Pick book for pending (until voting lands)</Label>
					<select
						id="pick-work"
						value={selectedWorkId}
						onChange={(event) => setSelectedWorkId(event.target.value)}
						className="h-9 rounded-md border bg-background px-3 text-sm"
					>
						<option value="">Select from booklist…</option>
						{(booklist.data?.items ?? []).map((item) => (
							<option key={item.id} value={item.workId}>
								{item.title}
							</option>
						))}
					</select>
					{booklist.isPending ? (
						<p className="text-xs text-muted-foreground">Loading booklist…</p>
					) : null}
				</div>
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
					<Button
						size="sm"
						disabled={busy || (session.status === "voting" && !selectedWorkId)}
						onClick={() => advance.mutate()}
					>
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

			{session.status === "voting" ? (
				<p className="text-sm text-muted-foreground text-pretty">
					Point voting arrives next. For now, admins/mods pick the book when advancing to pending.
				</p>
			) : null}
		</section>
	);
}
