"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ClubShareSheet } from "@/components/clubs/club-share-sheet";
import { ClubSubnav } from "@/components/clubs/club-subnav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ClubVisibility } from "@/lib/clubs/constants";
import { client, orpc } from "@/lib/orpc";
import { slugify } from "@/lib/slugify";
import type { ClubDetail } from "@/server/contracts";

interface ClubSettingsProps {
	initial: ClubDetail;
}

export function ClubSettings({ initial }: ClubSettingsProps) {
	const router = useRouter();
	const queryClient = useQueryClient();

	const { data: club = initial } = useQuery({
		...orpc.club.getBySlug.queryOptions({ input: { slug: initial.slug } }),
		initialData: initial,
	});

	const [name, setName] = useState(club.name);
	const [nextSlug, setNextSlug] = useState(club.slug);
	const [description, setDescription] = useState(club.description ?? "");
	const [visibility, setVisibility] = useState<ClubVisibility>(club.visibility);
	const [inviteCode, setInviteCode] = useState(club.inviteCode);

	const save = useMutation({
		mutationFn: () =>
			client.club.update({
				slug: club.slug,
				name,
				nextSlug: nextSlug !== club.slug ? nextSlug : undefined,
				description: description.trim() || null,
				visibility,
			}),
		onSuccess: async (updated) => {
			toast.success("Settings saved");
			await queryClient.invalidateQueries({ queryKey: orpc.club.key() });
			if (updated.slug !== club.slug) {
				router.replace(`/clubs/${updated.slug}/settings`);
			}
			router.refresh();
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not save");
		},
	});

	const rotate = useMutation({
		...orpc.club.rotateInviteCode.mutationOptions(),
		onSuccess: (data) => {
			setInviteCode(data.inviteCode);
			toast.success("Invite link rotated");
			void queryClient.invalidateQueries({ queryKey: orpc.club.key() });
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not rotate link");
		},
	});

	const remove = useMutation({
		...orpc.club.delete.mutationOptions(),
		onSuccess: () => {
			toast.success("Club deleted");
			void queryClient.invalidateQueries({ queryKey: orpc.club.key() });
			router.push("/clubs");
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not delete club");
		},
	});

	if (!club.canManageSettings) {
		return (
			<section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
				<p className="text-sm text-muted-foreground">Only the club admin can edit settings.</p>
			</section>
		);
	}

	return (
		<section className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
			<ClubSubnav slug={club.slug} showMembers={club.canViewContent} showSettings />

			<header className="grid gap-1">
				<h1 className="font-heading text-2xl font-semibold tracking-tight">Settings</h1>
				<p className="text-sm text-muted-foreground">{club.name}</p>
			</header>

			<form
				className="grid gap-4"
				onSubmit={(event) => {
					event.preventDefault();
					save.mutate();
				}}
			>
				<div className="grid gap-2">
					<Label htmlFor="settings-name">Name</Label>
					<Input
						id="settings-name"
						value={name}
						onChange={(event) => setName(event.target.value)}
						maxLength={80}
						required
					/>
				</div>
				<div className="grid gap-2">
					<Label htmlFor="settings-slug">Slug</Label>
					<Input
						id="settings-slug"
						value={nextSlug}
						onChange={(event) => setNextSlug(slugify(event.target.value).slice(0, 48))}
						maxLength={48}
						required
					/>
					<p className="text-xs text-muted-foreground">URL: /clubs/{nextSlug || "…"}</p>
				</div>
				<div className="grid gap-2">
					<Label htmlFor="settings-description">Description</Label>
					<textarea
						id="settings-description"
						value={description}
						onChange={(event) => setDescription(event.target.value)}
						maxLength={2000}
						rows={4}
						className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
					/>
				</div>
				<div className="grid gap-2">
					<Label htmlFor="settings-visibility">Visibility</Label>
					<select
						id="settings-visibility"
						value={visibility}
						onChange={(event) => setVisibility(event.target.value as ClubVisibility)}
						className="h-9 rounded-md border bg-background px-3 text-sm"
					>
						<option value="public">Public — anyone can join</option>
						<option value="private">Private — request or invite</option>
						<option value="invite_only">Invite only — hidden from search</option>
					</select>
				</div>
				<div>
					<Button type="submit" disabled={!name.trim() || !nextSlug.trim() || save.isPending}>
						{save.isPending ? "Saving…" : "Save changes"}
					</Button>
				</div>
			</form>

			<section className="grid gap-3 border-t border-border pt-8">
				<h2 className="font-heading text-lg font-semibold tracking-tight">Invite link</h2>
				<p className="text-sm text-muted-foreground">
					Share this link so people can join without a username invite. Rotating invalidates the old
					link.
				</p>
				<div className="flex flex-wrap gap-2">
					{inviteCode ? (
						<ClubShareSheet clubName={name || club.name} inviteCode={inviteCode} />
					) : null}
					<Button
						size="sm"
						variant="outline"
						disabled={rotate.isPending}
						onClick={() => {
							if (window.confirm("Rotate invite link? The current link will stop working.")) {
								rotate.mutate({ slug: club.slug });
							}
						}}
					>
						{rotate.isPending ? "Rotating…" : "Rotate link"}
					</Button>
				</div>
			</section>

			<section className="grid gap-3 border-t border-destructive/30 pt-8">
				<h2 className="font-heading text-lg font-semibold tracking-tight text-destructive">
					Danger zone
				</h2>
				<p className="text-sm text-muted-foreground">
					Delete this club and all memberships. This cannot be undone.
				</p>
				<div>
					<Button
						variant="destructive"
						disabled={remove.isPending}
						onClick={() => {
							if (
								window.confirm(
									`Delete “${club.name}”? This permanently removes the club and all memberships.`,
								)
							) {
								remove.mutate({ slug: club.slug });
							}
						}}
					>
						{remove.isPending ? "Deleting…" : "Delete club"}
					</Button>
				</div>
			</section>
		</section>
	);
}
