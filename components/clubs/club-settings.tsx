"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ClubShareSheet } from "@/components/clubs/club-share-sheet";
import { ClubSubnav } from "@/components/clubs/club-subnav";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
	ClubBooklistSettings,
	ClubShortlistMode,
	ClubVisibility,
	VoteChipsByRole,
} from "@/lib/clubs/constants";
import { parseChipListInput } from "@/lib/clubs/session-voting";
import { client, orpc } from "@/lib/orpc";
import { slugify } from "@/lib/slugify";
import type { ClubDetail } from "@/server/contracts";

function chipsToInput(chips: number[]): string {
	return chips.join(", ");
}

interface ClubSettingsProps {
	initial: ClubDetail;
}

function PermissionRow({
	id,
	label,
	checked,
	onCheckedChange,
}: {
	id: string;
	label: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
}) {
	return (
		<label htmlFor={id} className="flex items-center gap-2 text-sm">
			<Checkbox
				id={id}
				checked={checked}
				onCheckedChange={(value) => onCheckedChange(value === true)}
			/>
			<span>{label}</span>
		</label>
	);
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
	const [booklist, setBooklist] = useState<ClubBooklistSettings>(club.booklistSettings);
	const [chipInputs, setChipInputs] = useState({
		admin: chipsToInput(club.booklistSettings.voteChipsByRole.admin),
		moderator: chipsToInput(club.booklistSettings.voteChipsByRole.moderator),
		member: chipsToInput(club.booklistSettings.voteChipsByRole.member),
	});

	const save = useMutation({
		mutationFn: async () => {
			const parsed: VoteChipsByRole = {
				admin: parseChipListInput(chipInputs.admin) ?? [],
				moderator: parseChipListInput(chipInputs.moderator) ?? [],
				member: parseChipListInput(chipInputs.member) ?? [],
			};
			if (!parsed.admin.length || !parsed.moderator.length || !parsed.member.length) {
				throw new Error("Vote chips must be comma-separated integers per role");
			}

			const updated = await client.club.update({
				slug: club.slug,
				name,
				nextSlug: nextSlug !== club.slug ? nextSlug : undefined,
				description: description.trim() || null,
				visibility,
			});
			await client.club.updateBooklistSettings({
				slug: updated.slug,
				...booklist,
				voteChipsByRole: parsed,
			});
			return updated;
		},
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
			<ClubSubnav club={club} />

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

				<section className="grid gap-4 border-t border-border pt-6">
					<div className="grid gap-1">
						<h2 className="font-heading text-lg font-semibold tracking-tight">Booklist</h2>
						<p className="text-sm text-muted-foreground text-pretty">
							Admin can always add and remove. Members without add permission can propose books when
							propose is enabled.
						</p>
					</div>

					<div className="grid gap-2">
						<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
							Can add
						</p>
						<PermissionRow
							id="mods-can-add"
							label="Moderators"
							checked={booklist.modsCanAdd}
							onCheckedChange={(checked) =>
								setBooklist((prev) => ({ ...prev, modsCanAdd: checked }))
							}
						/>
						<PermissionRow
							id="members-can-add"
							label="Members"
							checked={booklist.membersCanAdd}
							onCheckedChange={(checked) =>
								setBooklist((prev) => ({ ...prev, membersCanAdd: checked }))
							}
						/>
					</div>

					<div className="grid gap-2">
						<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
							Can propose
						</p>
						<PermissionRow
							id="mods-can-propose"
							label="Moderators"
							checked={booklist.modsCanPropose}
							onCheckedChange={(checked) =>
								setBooklist((prev) => ({ ...prev, modsCanPropose: checked }))
							}
						/>
						<PermissionRow
							id="members-can-propose"
							label="Members"
							checked={booklist.membersCanPropose}
							onCheckedChange={(checked) =>
								setBooklist((prev) => ({ ...prev, membersCanPropose: checked }))
							}
						/>
					</div>

					<div className="grid gap-2">
						<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
							Can remove
						</p>
						<PermissionRow
							id="mods-can-remove"
							label="Moderators"
							checked={booklist.modsCanRemove}
							onCheckedChange={(checked) =>
								setBooklist((prev) => ({ ...prev, modsCanRemove: checked }))
							}
						/>
						<PermissionRow
							id="members-can-remove"
							label="Members"
							checked={booklist.membersCanRemove}
							onCheckedChange={(checked) =>
								setBooklist((prev) => ({ ...prev, membersCanRemove: checked }))
							}
						/>
					</div>

					<div className="grid gap-2 sm:grid-cols-2">
						<div className="grid gap-2">
							<Label htmlFor="shortlist-mode">Session shortlist</Label>
							<select
								id="shortlist-mode"
								value={booklist.shortlistMode}
								onChange={(event) =>
									setBooklist((prev) => ({
										...prev,
										shortlistMode: event.target.value as ClubShortlistMode,
									}))
								}
								className="h-9 rounded-md border bg-background px-3 text-sm"
							>
								<option value="manual">Manual pick</option>
								<option value="random">Random from booklist</option>
							</select>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="shortlist-size">Default shortlist size</Label>
							<Input
								id="shortlist-size"
								type="number"
								min={2}
								max={30}
								value={booklist.defaultShortlistSize}
								onChange={(event) =>
									setBooklist((prev) => ({
										...prev,
										defaultShortlistSize: Number(event.target.value) || prev.defaultShortlistSize,
									}))
								}
							/>
						</div>
					</div>

					<div className="grid gap-2">
						<p className="text-sm font-medium">Default vote chips (per role)</p>
						<p className="text-xs text-muted-foreground">
							Comma-separated unique points. Snapshotted onto each session when voting opens.
						</p>
						{(["admin", "moderator", "member"] as const).map((role) => (
							<div key={role} className="grid gap-1.5 sm:grid-cols-[7rem_1fr] sm:items-center">
								<Label htmlFor={`chips-${role}`} className="capitalize">
									{role}
								</Label>
								<Input
									id={`chips-${role}`}
									value={chipInputs[role]}
									onChange={(event) =>
										setChipInputs((prev) => ({ ...prev, [role]: event.target.value }))
									}
									placeholder="1, 2, 3"
								/>
							</div>
						))}
					</div>
				</section>

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
