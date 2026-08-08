"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ImageUploadButton } from "@/components/storage/image-upload-button";
import { authClient } from "@/lib/auth-client";
import { client, orpc } from "@/lib/orpc";

interface AvatarUploadProps {
	disabled?: boolean;
}

export function AvatarUpload({ disabled = false }: AvatarUploadProps) {
	const queryClient = useQueryClient();
	const { refetch } = authClient.useSession();

	const save = useMutation({
		mutationFn: (key: string) => client.user.updateAvatar({ key }),
		onSuccess: async () => {
			await refetch();
			void queryClient.invalidateQueries({ queryKey: orpc.user.key() });
			void queryClient.invalidateQueries({ queryKey: orpc.follow.key() });
			toast.success("Profile photo updated");
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not update profile photo");
		},
	});

	return (
		<ImageUploadButton
			label={save.isPending ? "Uploading…" : "Change photo"}
			purpose="user_avatar"
			aspect={1}
			title="Crop profile photo"
			description="Square crop. PNG, JPG, or WebP up to 2 MB."
			disabled={disabled || save.isPending}
			onUploaded={async ({ key }) => {
				await save.mutateAsync(key);
			}}
		/>
	);
}
