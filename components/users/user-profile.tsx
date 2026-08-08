"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, CalendarDays, Lock, Users } from "lucide-react";
import Link from "next/link";

import { FollowButton } from "@/components/follows/follow-button";
import { PrivateLocked } from "@/components/follows/private-locked";
import { Button } from "@/components/ui/button";
import { AvatarUpload } from "@/components/users/avatar-upload";
import { UserAvatar } from "@/components/users/user-avatar";
import { UserRoleBadge } from "@/components/users/user-role-badge";
import { formatMonthYear, formatRelativeTime } from "@/lib/dates";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/server/contracts";

interface UserProfileProps {
	profile: UserProfile;
	className?: string;
}

export function UserProfileView({ profile: initial, className }: UserProfileProps) {
	const { data: profile = initial } = useQuery({
		...orpc.follow.getProfile.queryOptions({ input: { username: initial.username } }),
		initialData: initial,
	});

	const isOwner = profile.relationship === "self";
	const canView = profile.canViewContent;

	return (
		<article className={cn("mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-12", className)}>
			<header className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">
				<div className="grid gap-3">
					<UserAvatar name={profile.name} image={profile.image} priority />
					{isOwner ? (
						<div className="flex justify-center sm:justify-start">
							<AvatarUpload />
						</div>
					) : null}
				</div>

				<div className="flex min-w-0 flex-1 flex-col gap-3">
					<div className="flex flex-col items-center gap-2 sm:items-start">
						<p className="font-mono text-sm text-muted-foreground">@{profile.username}</p>
						<h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
							{profile.name}
						</h1>
					</div>

					<div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
						<UserRoleBadge role={profile.role} />
						{profile.isPrivate ? (
							<span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
								<Lock className="size-3" aria-hidden />
								Private
							</span>
						) : null}
					</div>

					<p className="text-sm text-muted-foreground">
						<span className="font-medium text-foreground">{profile.followerCount}</span> followers
						<span className="mx-2 text-border">·</span>
						<span className="font-medium text-foreground">{profile.followingCount}</span> following
					</p>

					<dl className="grid gap-3 text-sm text-muted-foreground sm:max-w-md">
						<div className="flex items-center gap-2">
							<CalendarDays className="size-4 shrink-0" aria-hidden="true" />
							<dt className="sr-only">Member since</dt>
							<dd>
								Joined {formatMonthYear(profile.createdAt)}
								<span className="text-muted-foreground/80">
									{" "}
									· {formatRelativeTime(profile.createdAt)}
								</span>
							</dd>
						</div>
					</dl>

					{!isOwner ? (
						<div className="flex justify-center sm:justify-start">
							<FollowButton username={profile.username} relationship={profile.relationship} />
						</div>
					) : null}
				</div>
			</header>

			{!canView ? (
				<PrivateLocked username={profile.username} />
			) : (
				<section aria-labelledby="library-heading" className="flex flex-col gap-4">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-3">
							<div className="flex size-10 items-center justify-center border border-border bg-muted/30">
								<BookOpen className="size-4" aria-hidden="true" />
							</div>
							<div>
								<h2
									id="library-heading"
									className="font-heading text-xl font-semibold tracking-tight"
								>
									Library
								</h2>
								<p className="text-sm text-muted-foreground">
									Wishlist, reading, completed, and custom shelves.
								</p>
							</div>
						</div>
						<div className="flex flex-wrap gap-2">
							<Button
								size="sm"
								nativeButton={false}
								render={<Link href={`/users/${profile.username}/shelves`}>View shelves</Link>}
							/>
							<Button
								size="sm"
								variant="outline"
								nativeButton={false}
								render={<Link href={`/users/${profile.username}/diary`}>Diary</Link>}
							/>
							{isOwner ? (
								<Button
									size="sm"
									variant="ghost"
									nativeButton={false}
									render={
										<Link href="/people">
											<Users className="size-4" />
											People
										</Link>
									}
								/>
							) : null}
						</div>
					</div>
				</section>
			)}
		</article>
	);
}
