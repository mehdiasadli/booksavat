"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";

import { ClubSubnav } from "@/components/clubs/club-subnav";
import { CreateSessionDialog } from "@/components/clubs/create-session-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { orpc } from "@/lib/orpc";
import type { ClubDetail } from "@/server/contracts";

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

interface ClubSessionsProps {
	initial: ClubDetail;
}

export function ClubSessions({ initial }: ClubSessionsProps) {
	const { data: club = initial } = useQuery({
		...orpc.club.getBySlug.queryOptions({ input: { slug: initial.slug } }),
		initialData: initial,
	});

	const sessions = useQuery({
		...orpc.club.listReadingSessions.queryOptions({
			input: { slug: club.slug, limit: 50, offset: 0 },
		}),
		enabled: club.canViewContent,
	});

	if (!club.canViewContent) {
		return (
			<section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
				<p className="text-sm text-muted-foreground">You can’t view this club’s sessions.</p>
				<Button
					size="sm"
					nativeButton={false}
					render={<Link href={`/clubs/${club.slug}`}>Back</Link>}
				/>
			</section>
		);
	}

	return (
		<section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
			<ClubSubnav
				slug={club.slug}
				showBooklist={club.canViewContent}
				showSessions={club.canViewContent}
				showMembers={club.canViewContent}
				showSettings={club.canManageSettings}
			/>

			<header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div className="grid gap-1">
					<h1 className="font-heading text-2xl font-semibold tracking-tight">Sessions</h1>
					<p className="text-sm text-muted-foreground">{club.name}</p>
				</div>
				{club.canCreateSession ? <CreateSessionDialog slug={club.slug} /> : null}
			</header>

			{sessions.isPending ? (
				<div className="flex justify-center py-10">
					<Loader2 className="size-5 animate-spin text-muted-foreground" />
				</div>
			) : sessions.isError ? (
				<p className="py-8 text-sm text-destructive">Failed to load sessions.</p>
			) : !sessions.data?.items.length ? (
				<p className="py-8 text-sm text-muted-foreground">
					No reading sessions yet.
					{club.canCreateSession ? " Create one to get started." : ""}
				</p>
			) : (
				<ul className="divide-y divide-border">
					{sessions.data.items.map((session) => (
						<li key={session.id}>
							<Link
								href={`/clubs/${club.slug}/sessions/${session.id}`}
								className="flex items-center gap-3 py-3 transition-colors hover:bg-muted/40"
							>
								<div className="min-w-0 flex-1">
									<p className="truncate font-medium">
										{session.title?.trim() || "Reading session"}
									</p>
									<p className="text-xs text-muted-foreground">
										{session.participantCount}{" "}
										{session.participantCount === 1 ? "joined" : "joined"} · join by{" "}
										{session.joinDeadline.toLocaleString()}
									</p>
								</div>
								<Badge variant="secondary" className="shrink-0 font-normal">
									{statusLabel[session.status] ?? session.status}
								</Badge>
							</Link>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
