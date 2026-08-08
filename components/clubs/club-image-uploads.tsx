"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { toast } from "sonner";

import { ImageUploadButton } from "@/components/storage/image-upload-button";
import { UserAvatar } from "@/components/users/user-avatar";
import { client, orpc } from "@/lib/orpc";
import type { ClubDetail } from "@/server/contracts";

interface ClubImageUploadsProps {
	club: ClubDetail;
}

export function ClubImageUploads({ club }: ClubImageUploadsProps) {
	const queryClient = useQueryClient();

	const save = useMutation({
		mutationFn: (patch: { avatarKey?: string; coverKey?: string }) =>
			client.club.updateImages({ slug: club.slug, ...patch }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: orpc.club.key() });
			toast.success("Club images updated");
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not update club images");
		},
	});

	return (
		<section className="grid gap-4 border-t border-border pt-6">
			<div className="grid gap-1">
				<h2 className="font-heading text-lg font-semibold tracking-tight">Images</h2>
				<p className="text-sm text-muted-foreground text-pretty">
					Square avatar and wide cover for the club profile. PNG, JPG, or WebP only.
				</p>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<div className="grid gap-3">
					<p className="text-sm font-medium">Avatar</p>
					<div className="flex items-center gap-4">
						{club.avatarUrl ? (
							<Image
								src={club.avatarUrl}
								alt={`${club.name} avatar`}
								width={96}
								height={96}
								className="size-24 object-cover ring-1 ring-foreground/10"
							/>
						) : (
							<UserAvatar name={club.name} image={null} size="lg" />
						)}
						<ImageUploadButton
							label={save.isPending ? "Uploading…" : "Change avatar"}
							purpose="club_avatar"
							aspect={1}
							title="Crop club avatar"
							description="Square crop up to 2 MB."
							slug={club.slug}
							disabled={save.isPending}
							onUploaded={async ({ key }) => {
								await save.mutateAsync({ avatarKey: key });
							}}
						/>
					</div>
				</div>

				<div className="grid gap-3">
					<p className="text-sm font-medium">Cover</p>
					<div className="grid gap-3">
						<div className="relative aspect-[16/9] overflow-hidden border border-border bg-muted/30">
							{club.coverUrl ? (
								<Image
									src={club.coverUrl}
									alt={`${club.name} cover`}
									fill
									className="object-cover"
									sizes="(max-width: 768px) 100vw, 480px"
								/>
							) : (
								<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
									No cover yet
								</div>
							)}
						</div>
						<ImageUploadButton
							label={save.isPending ? "Uploading…" : "Change cover"}
							purpose="club_cover"
							aspect={16 / 9}
							title="Crop club cover"
							description="Wide 16:9 crop up to 5 MB."
							slug={club.slug}
							disabled={save.isPending}
							onUploaded={async ({ key }) => {
								await save.mutateAsync({ coverKey: key });
							}}
						/>
					</div>
				</div>
			</div>
		</section>
	);
}
