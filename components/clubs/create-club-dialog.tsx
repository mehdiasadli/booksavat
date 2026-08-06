"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ClubVisibility } from "@/lib/clubs/constants";
import { client, orpc } from "@/lib/orpc";
import { slugify } from "@/lib/slugify";

export function CreateClubDialog() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [slugTouched, setSlugTouched] = useState(false);
	const [description, setDescription] = useState("");
	const [visibility, setVisibility] = useState<ClubVisibility>("public");

	const create = useMutation({
		mutationFn: () =>
			client.club.create({
				name,
				slug: slug.trim() || undefined,
				description: description.trim() || null,
				visibility,
			}),
		onSuccess: async (club) => {
			toast.success("Club created");
			setOpen(false);
			setName("");
			setSlug("");
			setSlugTouched(false);
			setDescription("");
			setVisibility("public");
			await queryClient.invalidateQueries({ queryKey: orpc.club.key() });
			router.push(`/clubs/${club.slug}`);
			router.refresh();
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not create club");
		},
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<Button size="sm">New club</Button>} />
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Create a club</DialogTitle>
					<DialogDescription>
						Clubs are communities for reading together. Booklists and sessions come later.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-2">
					<div className="grid gap-2">
						<Label htmlFor="club-name">Name</Label>
						<Input
							id="club-name"
							value={name}
							onChange={(event) => {
								const next = event.target.value;
								setName(next);
								if (!slugTouched) {
									setSlug(slugify(next).slice(0, 48));
								}
							}}
							placeholder="Friday Night Readers"
							maxLength={80}
							autoComplete="off"
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="club-slug">Slug</Label>
						<Input
							id="club-slug"
							value={slug}
							onChange={(event) => {
								setSlugTouched(true);
								setSlug(slugify(event.target.value).slice(0, 48));
							}}
							placeholder="friday_night_readers"
							maxLength={48}
							autoComplete="off"
						/>
						<p className="text-xs text-muted-foreground">URL: /clubs/{slug || "…"}</p>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="club-description">Description</Label>
						<Input
							id="club-description"
							value={description}
							onChange={(event) => setDescription(event.target.value)}
							placeholder="Optional"
							maxLength={2000}
							autoComplete="off"
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="club-visibility">Visibility</Label>
						<select
							id="club-visibility"
							value={visibility}
							onChange={(event) => setVisibility(event.target.value as ClubVisibility)}
							className="h-9 rounded-md border bg-background px-3 text-sm"
						>
							<option value="public">Public — anyone can join</option>
							<option value="private">Private — request or invite</option>
							<option value="invite_only">Invite only — hidden from search</option>
						</select>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						Cancel
					</Button>
					<Button disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
						{create.isPending ? "Creating…" : "Create"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
