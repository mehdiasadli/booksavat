"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { PrivacySettings } from "@/components/follows/privacy-settings";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/users/user-avatar";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";

function PeopleList({ kind }: { kind: "following" | "followers" | "requests" }) {
	const queryClient = useQueryClient();

	const query =
		kind === "following"
			? orpc.follow.listFollowing.queryOptions({ input: { limit: 50, offset: 0 } })
			: kind === "followers"
				? orpc.follow.listFollowers.queryOptions({ input: { limit: 50, offset: 0 } })
				: orpc.follow.listRequests.queryOptions({ input: { limit: 50, offset: 0 } });

	const { data, isPending, isError, error } = useQuery(query);

	const accept = useMutation({
		...orpc.follow.acceptRequest.mutationOptions(),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: orpc.follow.key() });
			toast.success("Request accepted");
		},
		onError: (err) => {
			toast.error(err instanceof Error ? err.message : "Could not accept");
		},
	});

	const reject = useMutation({
		...orpc.follow.rejectRequest.mutationOptions(),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: orpc.follow.key() });
			toast.success("Request rejected");
		},
		onError: (err) => {
			toast.error(err instanceof Error ? err.message : "Could not reject");
		},
	});

	if (isPending) {
		return (
			<div className="flex justify-center py-10">
				<Loader2 className="size-5 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (isError) {
		return (
			<p className="py-8 text-sm text-destructive">
				{error instanceof Error ? error.message : "Failed to load"}
			</p>
		);
	}

	if (!data?.items.length) {
		const empty =
			kind === "following"
				? "You’re not following anyone yet."
				: kind === "followers"
					? "No followers yet."
					: "No pending requests.";
		return <p className="py-8 text-sm text-muted-foreground">{empty}</p>;
	}

	return (
		<ul className="divide-y divide-border">
			{data.items.map((edge) => (
				<li key={edge.id} className="flex items-center gap-3 py-3">
					<Link
						href={`/users/${edge.user.username}`}
						className="flex min-w-0 flex-1 items-center gap-3"
					>
						<UserAvatar name={edge.user.name} image={edge.user.image} size="md" />
						<div className="min-w-0">
							<p className="truncate font-medium">{edge.user.name}</p>
							<p className="truncate text-sm text-muted-foreground">@{edge.user.username}</p>
						</div>
					</Link>
					{kind === "requests" ? (
						<div className="flex shrink-0 gap-2">
							<Button
								size="sm"
								disabled={accept.isPending || reject.isPending}
								onClick={() => accept.mutate({ username: edge.user.username })}
							>
								Accept
							</Button>
							<Button
								size="sm"
								variant="outline"
								disabled={accept.isPending || reject.isPending}
								onClick={() => reject.mutate({ username: edge.user.username })}
							>
								Reject
							</Button>
						</div>
					) : null}
				</li>
			))}
		</ul>
	);
}

export function PeoplePage() {
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return (
			<div className="flex justify-center py-16">
				<Loader2 className="size-5 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!session?.user) {
		return (
			<section className="mx-auto max-w-2xl py-12">
				<p className="text-sm text-muted-foreground">Sign in to manage follows.</p>
				<Button className="mt-4" nativeButton={false} render={<Link href="/login">Sign in</Link>} />
			</section>
		);
	}

	const isPrivate = Boolean(session.user.isPrivate);

	return (
		<section className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10 sm:px-6">
			<header className="grid gap-2">
				<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">People</p>
				<h1 className="font-heading text-3xl font-semibold tracking-tight">
					Following & followers
				</h1>
				<p className="text-sm text-muted-foreground text-pretty">
					Manage who you follow, who follows you, and incoming requests.
				</p>
			</header>

			<PrivacySettings isPrivate={isPrivate} />

			<Tabs defaultValue="following">
				<TabsList variant="line" className="w-full justify-start">
					<TabsTrigger value="following">Following</TabsTrigger>
					<TabsTrigger value="followers">Followers</TabsTrigger>
					<TabsTrigger value="requests">Requests</TabsTrigger>
				</TabsList>
				<TabsContent value="following">
					<PeopleList kind="following" />
				</TabsContent>
				<TabsContent value="followers">
					<PeopleList kind="followers" />
				</TabsContent>
				<TabsContent value="requests">
					<PeopleList kind="requests" />
				</TabsContent>
			</Tabs>
		</section>
	);
}
