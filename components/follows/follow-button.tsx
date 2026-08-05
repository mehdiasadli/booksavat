"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type * as z from "zod";

import { Button } from "@/components/ui/button";
import { orpc } from "@/lib/orpc";
import type { followRelationshipSchema } from "@/server/contracts";

type FollowRelationship = z.infer<typeof followRelationshipSchema>;

interface FollowButtonProps {
	username: string;
	relationship: FollowRelationship;
	onRelationshipChange?: (relationship: FollowRelationship) => void;
	size?: "sm" | "default";
}

export function FollowButton({
	username,
	relationship,
	onRelationshipChange,
	size = "sm",
}: FollowButtonProps) {
	const queryClient = useQueryClient();

	const follow = useMutation({
		...orpc.follow.follow.mutationOptions(),
		onSuccess: (data) => {
			onRelationshipChange?.(data.relationship);
			void queryClient.invalidateQueries({ queryKey: orpc.follow.key() });
			toast.success(data.relationship === "pending_outgoing" ? "Follow request sent" : "Following");
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not follow");
		},
	});

	const unfollow = useMutation({
		...orpc.follow.unfollow.mutationOptions(),
		onSuccess: () => {
			onRelationshipChange?.("none");
			void queryClient.invalidateQueries({ queryKey: orpc.follow.key() });
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not unfollow");
		},
	});

	if (relationship === "self") {
		return null;
	}

	const busy = follow.isPending || unfollow.isPending;

	if (relationship === "following") {
		return (
			<Button
				size={size}
				variant="outline"
				disabled={busy}
				onClick={() => unfollow.mutate({ username })}
			>
				{busy ? <Loader2 className="size-4 animate-spin" /> : null}
				Following
			</Button>
		);
	}

	if (relationship === "pending_outgoing") {
		return (
			<Button
				size={size}
				variant="outline"
				disabled={busy}
				onClick={() => unfollow.mutate({ username })}
			>
				{busy ? <Loader2 className="size-4 animate-spin" /> : null}
				Requested
			</Button>
		);
	}

	if (relationship === "pending_incoming") {
		return (
			<Button size={size} disabled>
				Requested you
			</Button>
		);
	}

	return (
		<Button size={size} disabled={busy} onClick={() => follow.mutate({ username })}>
			{busy ? <Loader2 className="size-4 animate-spin" /> : null}
			Follow
		</Button>
	);
}
