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

function defaultJoinDeadline(): string {
	const d = new Date();
	d.setDate(d.getDate() + 3);
	d.setMinutes(0, 0, 0);
	return toLocalInput(d);
}

function defaultReadingDeadline(): string {
	const d = new Date();
	d.setDate(d.getDate() + 21);
	d.setMinutes(0, 0, 0);
	return toLocalInput(d);
}

function toLocalInput(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface CreateSessionDialogProps {
	slug: string;
}

export function CreateSessionDialog({ slug }: CreateSessionDialogProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState("");
	const [joinDeadline, setJoinDeadline] = useState(defaultJoinDeadline);
	const [readingDeadline, setReadingDeadline] = useState(defaultReadingDeadline);

	const create = useMutation({
		mutationFn: () =>
			client.club.createReadingSession({
				slug,
				title: title.trim() || null,
				joinDeadline: new Date(joinDeadline),
				readingDeadline: readingDeadline ? new Date(readingDeadline) : null,
			}),
		onSuccess: async (session) => {
			toast.success("Session created");
			setOpen(false);
			setTitle("");
			await queryClient.invalidateQueries({ queryKey: orpc.club.key() });
			router.push(`/clubs/${slug}/sessions/${session.id}`);
			router.refresh();
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not create session");
		},
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<Button size="sm">New session</Button>} />
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Start a reading session</DialogTitle>
					<DialogDescription>
						Members can join until the join deadline. Stages advance manually for now.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-2">
					<div className="grid gap-2">
						<Label htmlFor="session-title">Title (optional)</Label>
						<Input
							id="session-title"
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							placeholder="April classics"
							maxLength={120}
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="join-deadline">Join deadline</Label>
						<Input
							id="join-deadline"
							type="datetime-local"
							value={joinDeadline}
							onChange={(event) => setJoinDeadline(event.target.value)}
							required
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="reading-deadline">Reading deadline (optional)</Label>
						<Input
							id="reading-deadline"
							type="datetime-local"
							value={readingDeadline}
							onChange={(event) => setReadingDeadline(event.target.value)}
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						Cancel
					</Button>
					<Button disabled={!joinDeadline || create.isPending} onClick={() => create.mutate()}>
						{create.isPending ? "Creating…" : "Create"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
