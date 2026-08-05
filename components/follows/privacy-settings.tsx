"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";

interface PrivacySettingsProps {
	isPrivate: boolean;
}

export function PrivacySettings({ isPrivate }: PrivacySettingsProps) {
	const queryClient = useQueryClient();
	const { refetch } = authClient.useSession();

	const update = useMutation({
		...orpc.follow.setPrivacy.mutationOptions(),
		onSuccess: async (data) => {
			await refetch();
			void queryClient.invalidateQueries({ queryKey: orpc.follow.key() });
			toast.success(data.isPrivate ? "Account is now private" : "Account is now public");
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not update privacy");
		},
	});

	return (
		<div className="flex items-start gap-3 rounded-lg border border-border px-4 py-3">
			<Checkbox
				id="private-account"
				checked={isPrivate}
				disabled={update.isPending}
				onCheckedChange={(checked) => {
					update.mutate({ isPrivate: checked === true });
				}}
			/>
			<div className="grid gap-1">
				<Label htmlFor="private-account" className="font-medium">
					Private account
				</Label>
				<p className="text-sm text-muted-foreground text-pretty">
					Only approved followers can see your shelves, diary, and reviews. Going public accepts
					pending requests.
				</p>
			</div>
		</div>
	);
}
