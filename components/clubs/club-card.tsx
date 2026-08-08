import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";
import type { ClubSummary } from "@/server/contracts";

const visibilityLabel: Record<ClubSummary["visibility"], string> = {
	public: "Public",
	private: "Private",
	invite_only: "Invite only",
};

interface ClubCardProps {
	club: ClubSummary;
	className?: string;
}

export function ClubCard({ club, className }: ClubCardProps) {
	return (
		<Link
			href={`/clubs/${club.slug}`}
			className={cn(
				"flex gap-4 border-b border-border py-4 transition-colors hover:bg-muted/40",
				className,
			)}
		>
			{club.avatarUrl ? (
				<Image
					src={club.avatarUrl}
					alt=""
					width={56}
					height={56}
					className="size-14 shrink-0 object-cover ring-1 ring-foreground/10"
				/>
			) : (
				<div className="flex size-14 shrink-0 items-center justify-center bg-muted text-lg font-heading font-semibold text-muted-foreground ring-1 ring-foreground/10">
					{club.name.slice(0, 1).toUpperCase()}
				</div>
			)}
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="flex items-baseline justify-between gap-3">
					<h3 className="font-heading text-lg font-semibold tracking-tight">{club.name}</h3>
					<span className="shrink-0 text-xs text-muted-foreground">
						{visibilityLabel[club.visibility]}
					</span>
				</div>
				<p className="text-sm text-muted-foreground">@{club.slug}</p>
				{club.description ? (
					<p className="line-clamp-2 text-sm text-muted-foreground text-pretty">
						{club.description}
					</p>
				) : null}
				<p className="text-xs text-muted-foreground">
					{club.memberCount} {club.memberCount === 1 ? "member" : "members"}
				</p>
			</div>
		</Link>
	);
}
