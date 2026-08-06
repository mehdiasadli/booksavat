"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import type { ClubDetail } from "@/server/contracts";

interface JoinByCodeProps {
	inviteCode: string;
	initial: ClubDetail | null;
	previewError?: string;
}

export function JoinByCode({ inviteCode, initial, previewError }: JoinByCodeProps) {
	const router = useRouter();
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const [signingIn, setSigningIn] = useState(false);

	const join = useMutation({
		...orpc.club.joinByCode.mutationOptions(),
		onSuccess: (club) => {
			toast.success(`Joined ${club.name}`);
			router.push(`/clubs/${club.slug}`);
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not join");
		},
	});

	async function signIn() {
		setSigningIn(true);
		try {
			const { error } = await authClient.signIn.social({
				provider: "google",
				callbackURL: `/join/${inviteCode}`,
			});
			if (error) throw new Error(error.message);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to sign in");
			setSigningIn(false);
		}
	}

	if (sessionPending) {
		return (
			<div className="flex justify-center py-16">
				<Loader2 className="size-5 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!session?.user) {
		return (
			<section className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-16 text-center sm:px-6">
				<h1 className="font-heading text-2xl font-semibold tracking-tight">Join a club</h1>
				<p className="text-sm text-muted-foreground text-pretty">
					Sign in to accept this invite and join the club.
				</p>
				<div className="flex justify-center gap-2">
					<Button loading={signingIn} onClick={() => void signIn()}>
						Sign in to join
					</Button>
					<Button
						variant="outline"
						nativeButton={false}
						render={<Link href="/clubs">Browse clubs</Link>}
					/>
				</div>
			</section>
		);
	}

	if (!initial || previewError) {
		return (
			<section className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-16 text-center sm:px-6">
				<h1 className="font-heading text-2xl font-semibold tracking-tight">Invite not found</h1>
				<p className="text-sm text-muted-foreground text-pretty">
					{previewError ?? "This invite link is invalid or has been rotated."}
				</p>
				<div className="flex justify-center">
					<Button nativeButton={false} render={<Link href="/clubs">Back to clubs</Link>} />
				</div>
			</section>
		);
	}

	const alreadyMember = initial.membership?.status === "active";

	return (
		<section className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16 sm:px-6">
			<header className="grid gap-2 text-center">
				<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
					Club invite
				</p>
				<h1 className="font-heading text-2xl font-semibold tracking-tight">{initial.name}</h1>
				{initial.description ? (
					<p className="text-sm text-muted-foreground text-pretty">{initial.description}</p>
				) : null}
				<p className="text-xs text-muted-foreground">
					{initial.memberCount} {initial.memberCount === 1 ? "member" : "members"} · @{initial.slug}
				</p>
			</header>

			<div className="flex flex-col items-center gap-2">
				{alreadyMember ? (
					<>
						<p className="text-sm text-muted-foreground">You’re already a member.</p>
						<Button
							nativeButton={false}
							render={<Link href={`/clubs/${initial.slug}`}>Open club</Link>}
						/>
					</>
				) : (
					<Button disabled={join.isPending} onClick={() => join.mutate({ inviteCode })}>
						{join.isPending ? "Joining…" : "Join club"}
					</Button>
				)}
			</div>
		</section>
	);
}
