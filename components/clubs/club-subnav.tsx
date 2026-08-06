"use client";

import { BookMarked, CalendarDays, Settings, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ClubDetail } from "@/server/contracts";

const statusLabel: Record<string, string> = {
	proposed: "Proposed",
	voting: "Voting",
	pending: "Pending",
	reading: "Reading",
	reviewing: "Reviewing",
};

interface ClubSubnavProps {
	club: Pick<
		ClubDetail,
		"slug" | "name" | "canViewContent" | "canManageSettings" | "activeSession"
	>;
}

export function ClubSubnav({ club }: ClubSubnavProps) {
	const pathname = usePathname();
	const base = `/clubs/${club.slug}`;

	const items = [
		{ href: base, label: "Profile", icon: UserRound, exact: true, show: true },
		{
			href: `${base}/booklist`,
			label: "Booklist",
			icon: BookMarked,
			exact: false,
			show: club.canViewContent,
		},
		{
			href: `${base}/sessions`,
			label: "Sessions",
			icon: CalendarDays,
			exact: false,
			show: club.canViewContent,
		},
		{
			href: `${base}/members`,
			label: "Members",
			icon: Users,
			exact: false,
			show: club.canViewContent,
		},
		{
			href: `${base}/settings`,
			label: "Settings",
			icon: Settings,
			exact: false,
			show: club.canManageSettings,
		},
	].filter((item) => item.show);

	const activeSession = club.canViewContent ? club.activeSession : null;
	const activeSessionHref = activeSession ? `${base}/sessions/${activeSession.id}` : null;
	const onActiveSession =
		Boolean(activeSessionHref) &&
		(pathname === activeSessionHref || pathname.startsWith(`${activeSessionHref}/`));

	if (items.length === 0) return null;

	return (
		<div className="grid gap-3 border-b border-border pb-4">
			<nav aria-label={`${club.name} sections`} className="flex flex-wrap gap-1">
				{items.map((item) => {
					const active = item.exact
						? pathname === item.href
						: pathname === item.href || pathname.startsWith(`${item.href}/`);
					const Icon = item.icon;
					return (
						<Button
							key={item.href}
							size="sm"
							variant={active ? "secondary" : "ghost"}
							nativeButton={false}
							className={cn("gap-1.5", !active && "text-muted-foreground")}
							render={
								<Link href={item.href}>
									<Icon className="size-3.5" aria-hidden />
									{item.label}
								</Link>
							}
						/>
					);
				})}
			</nav>

			{activeSession && activeSessionHref ? (
				<div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
					<div className="min-w-0 flex-1">
						<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
							Active session
						</p>
						<p className="truncate text-sm font-medium">
							{activeSession.title?.trim() || "Reading session"}
						</p>
					</div>
					<Badge variant="outline">
						{statusLabel[activeSession.status] ?? activeSession.status}
					</Badge>
					<Button
						size="sm"
						variant={onActiveSession ? "secondary" : "outline"}
						nativeButton={false}
						render={<Link href={activeSessionHref}>Open</Link>}
					/>
				</div>
			) : null}
		</div>
	);
}
