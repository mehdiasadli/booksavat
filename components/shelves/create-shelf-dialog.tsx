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
import { client, orpc } from "@/lib/orpc";

interface CreateShelfDialogProps {
	username: string;
}

export function CreateShelfDialog({ username }: CreateShelfDialogProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [visibility, setVisibility] = useState<"private" | "followers_only" | "public">("private");
	const [isOrdered, setIsOrdered] = useState(false);

	const create = useMutation({
		mutationFn: () =>
			client.shelf.create({
				name,
				description: description.trim() || null,
				visibility,
				isOrdered,
			}),
		onSuccess: async (shelf) => {
			toast.success("Shelf created");
			setOpen(false);
			setName("");
			setDescription("");
			setVisibility("private");
			setIsOrdered(false);
			await queryClient.invalidateQueries({
				queryKey: orpc.shelf.listByUsername.queryKey({ input: { username } }),
			});
			router.push(`/users/${username}/shelves/${shelf.slug}`);
			router.refresh();
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not create shelf");
		},
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<Button size="sm">New shelf</Button>} />
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Create a shelf</DialogTitle>
					<DialogDescription>
						Custom shelves can hold any works. You can change visibility and ordering later.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-2">
					<div className="grid gap-2">
						<Label htmlFor="shelf-name">Name</Label>
						<Input
							id="shelf-name"
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder="Favorites"
							maxLength={80}
							autoComplete="off"
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="shelf-description">Description</Label>
						<Input
							id="shelf-description"
							value={description}
							onChange={(event) => setDescription(event.target.value)}
							placeholder="Optional"
							maxLength={500}
							autoComplete="off"
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="shelf-visibility">Visibility</Label>
						<select
							id="shelf-visibility"
							value={visibility}
							onChange={(event) => setVisibility(event.target.value as typeof visibility)}
							className="h-9 rounded-md border bg-background px-3 text-sm"
						>
							<option value="private">Private</option>
							<option value="followers_only">Followers only</option>
							<option value="public">Public</option>
						</select>
					</div>
					<label className="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							checked={isOrdered}
							onChange={(event) => setIsOrdered(event.target.checked)}
							className="size-4"
						/>
						Ordered list (numbered positions, drag to reorder)
					</label>
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
