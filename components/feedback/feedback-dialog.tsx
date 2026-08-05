"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Rating } from "@/components/reui/rating";
import { RichTextEditor } from "@/components/rich-text/rich-text-editor";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { isValidFeedbackRating } from "@/lib/feedback/rating";
import { client, orpc } from "@/lib/orpc";
import { EMPTY_RICH_TEXT_DOCUMENT, type RichTextDocument } from "@/lib/rich-text/document";

interface FeedbackDialogProps {
	workId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function FeedbackDialog({ workId, open, onOpenChange }: FeedbackDialogProps) {
	const queryClient = useQueryClient();
	const [rating, setRating] = useState(0);
	const [review, setReview] = useState<RichTextDocument>(EMPTY_RICH_TEXT_DOCUMENT);

	const existingQuery = useQuery({
		...orpc.feedback.getForWork.queryOptions({
			input: { workId },
		}),
		enabled: open,
		staleTime: 15_000,
	});

	useEffect(() => {
		if (!open) {
			return;
		}
		const existing = existingQuery.data;
		if (existing) {
			setRating(existing.rating);
			setReview((existing.review as RichTextDocument | null) ?? EMPTY_RICH_TEXT_DOCUMENT);
			return;
		}
		if (existingQuery.isFetched && !existing) {
			setRating(0);
			setReview(EMPTY_RICH_TEXT_DOCUMENT);
		}
	}, [open, existingQuery.data, existingQuery.isFetched]);

	const save = useMutation({
		mutationFn: () =>
			client.feedback.upsert({
				workId,
				rating,
				review,
			}),
		onSuccess: async () => {
			toast.success("Feedback saved");
			await queryClient.invalidateQueries({
				queryKey: orpc.feedback.getForWork.queryKey({ input: { workId } }),
			});
			onOpenChange(false);
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not save feedback");
		},
	});

	const remove = useMutation({
		mutationFn: () => client.feedback.delete({ workId }),
		onSuccess: async () => {
			toast.success("Feedback deleted");
			await queryClient.invalidateQueries({
				queryKey: orpc.feedback.getForWork.queryKey({ input: { workId } }),
			});
			onOpenChange(false);
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not delete feedback");
		},
	});

	const busy = save.isPending || remove.isPending;
	const canSave = isValidFeedbackRating(rating);

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (busy) {
					return;
				}
				onOpenChange(next);
			}}
		>
			<DialogContent className="sm:max-w-lg" showCloseButton={!busy}>
				<DialogHeader>
					<DialogTitle>{existingQuery.data ? "Edit feedback" : "Rate & review"}</DialogTitle>
					<DialogDescription>
						One feedback per book. Re-reads keep the same rating and review — update anytime.
					</DialogDescription>
				</DialogHeader>

				{existingQuery.isLoading ? (
					<p className="flex items-center gap-2 text-sm text-muted-foreground">
						<Loader2 className="size-3.5 animate-spin" />
						Loading…
					</p>
				) : (
					<div className="grid gap-4 py-1">
						<div className="grid gap-2">
							<Label>Rating</Label>
							<Rating rating={rating} editable showValue step={0.5} onRatingChange={setRating} />
						</div>

						<div className="grid gap-2">
							<Label>Review</Label>
							<RichTextEditor
								value={review}
								onChange={setReview}
								placeholder="What did you think? Optional."
								disabled={busy}
								aria-label="Book review"
							/>
						</div>
					</div>
				)}

				<DialogFooter className="sm:justify-between">
					{existingQuery.data ? (
						<Button variant="ghost" disabled={busy} onClick={() => remove.mutate()}>
							{remove.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
							Delete
						</Button>
					) : (
						<span />
					)}
					<div className="flex gap-2">
						<Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button disabled={busy || !canSave} onClick={() => save.mutate()}>
							{save.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
							Save
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
