import { BookOpen, CalendarDays } from "lucide-react";

import ComingSoonBlock from "@/components/coming-soon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/users/user-avatar";
import { UserRoleBadge } from "@/components/users/user-role-badge";
import { formatMonthYear, formatRelativeTime } from "@/lib/dates";
import { buildUserProfileJsonLd } from "@/lib/users/profile.server";
import { cn } from "@/lib/utils";
import type { User } from "@/server/contracts";

interface UserProfileProps {
	user: User;
	className?: string;
}

export function UserProfile({ user, className }: UserProfileProps) {
	const jsonLd = buildUserProfileJsonLd(user);

	return (
		<>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires a script tag.
				dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
			/>

			<article
				className={cn("mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-12", className)}
			>
				<header className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">
					<UserAvatar name={user.name} image={user.image} />

					<div className="flex min-w-0 flex-1 flex-col gap-3">
						<div className="flex flex-col items-center gap-2 sm:items-start">
							<p className="font-mono text-sm text-muted-foreground">@{user.username}</p>
							<h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
								{user.name}
							</h1>
						</div>

						<div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
							<UserRoleBadge role={user.role} />
						</div>

						<dl className="grid gap-3 text-sm text-muted-foreground sm:max-w-md">
							<div className="flex items-center gap-2">
								<CalendarDays className="size-4 shrink-0" aria-hidden="true" />
								<dt className="sr-only">Member since</dt>
								<dd>
									Joined {formatMonthYear(user.createdAt)}
									<span className="text-muted-foreground/80">
										{" "}
										· {formatRelativeTime(user.createdAt)}
									</span>
								</dd>
							</div>
						</dl>
					</div>
				</header>

				<section aria-labelledby="library-heading" className="flex flex-col gap-4">
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
								Shelves, reading lists, and shared sessions will appear here.
							</p>
						</div>
					</div>

					<Card>
						<CardHeader>
							<CardTitle>Reading activity</CardTitle>
							<CardDescription>
								{user.name} has not published any shelves or sessions yet.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ComingSoonBlock
								className="min-h-0 bg-transparent px-0 py-8"
								iconWrapperClassName="size-10"
								title="Library coming soon"
								description="BookSavat is still wiring up public shelves and reading sessions. Check back soon to see what this reader is working through."
							/>
						</CardContent>
					</Card>
				</section>
			</article>
		</>
	);
}
