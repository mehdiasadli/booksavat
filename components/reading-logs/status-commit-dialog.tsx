"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { client, orpc } from "@/lib/orpc";
import { LOGGABLE_SYSTEM_KEYS, type LoggableSystemKey } from "@/lib/reading-logs/constants";
import { summarizeReadingHistory } from "@/lib/reading-logs/history";
import { READING_LOG_STATUS_LABEL } from "@/lib/reading-logs/labels";
import { startOfLocalDay, validateReadingLogInput } from "@/lib/reading-logs/validation";

export type PendingStatusChange = {
	shelfId: string;
	systemKey: LoggableSystemKey;
	shelfName: string;
};

interface StatusCommitDialogProps {
	workId: string;
	pending: PendingStatusChange | null;
	onOpenChange: (open: boolean) => void;
	onCommitted?: () => void;
}

export function isLoggableStatusKey(key: string | null | undefined): key is LoggableSystemKey {
	return key != null && (LOGGABLE_SYSTEM_KEYS as readonly string[]).includes(key);
}

export function StatusCommitDialog({
	workId,
	pending,
	onOpenChange,
	onCommitted,
}: StatusCommitDialogProps) {
	const queryClient = useQueryClient();
	const open = pending != null;
	const [startedAt, setStartedAt] = useState<Date | null>(null);
	const [finishedAt, setFinishedAt] = useState<Date | null>(null);

	const historyQuery = useQuery({
		...orpc.readingLog.listForWork.queryOptions({
			input: { workId },
		}),
		enabled: open,
		staleTime: 15_000,
	});

	const history = useMemo(
		() => summarizeReadingHistory(historyQuery.data?.items ?? []),
		[historyQuery.data?.items],
	);

	const today = startOfLocalDay(new Date());
	const isReread = history.hasPriorFinished;

	useEffect(() => {
		if (!pending) {
			return;
		}
		const day = startOfLocalDay(new Date());
		setStartedAt(day);
		setFinishedAt(pending.systemKey === "reading" ? null : day);
	}, [pending]);

	const validationError = pending
		? validateReadingLogInput(
				{
					status: pending.systemKey,
					startedAt,
					finishedAt: pending.systemKey === "reading" ? null : finishedAt,
				},
				{
					isReread,
					hasPriorFinished: history.hasPriorFinished,
					hasNonRereadFinished: history.hasNonRereadFinished,
				},
			)
		: null;

	async function invalidate() {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: orpc.shelf.membershipForWork.queryKey({ input: { workId } }),
			}),
			queryClient.invalidateQueries({
				queryKey: orpc.readingLog.getActiveForWork.queryKey({ input: { workId } }),
			}),
			queryClient.invalidateQueries({
				queryKey: orpc.readingLog.listForWork.queryKey({ input: { workId } }),
			}),
		]);
	}

	const save = useMutation({
		mutationFn: async () => {
			if (!pending) {
				throw new Error("Nothing to save");
			}
			if (validationError) {
				throw new Error(validationError);
			}

			await client.shelf.addWork({ shelfId: pending.shelfId, workId });

			const active = await client.readingLog.getActiveForWork({ workId });
			if (!active) {
				return;
			}

			await client.readingLog.update({
				logId: active.id,
				status: pending.systemKey,
				startedAt,
				finishedAt: pending.systemKey === "reading" ? null : finishedAt,
				isReread,
			});
		},
		onSuccess: async () => {
			toast.success(
				`Marked as ${pending ? READING_LOG_STATUS_LABEL[pending.systemKey] : "updated"}`,
			);
			onOpenChange(false);
			await invalidate();
			onCommitted?.();
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not save status");
		},
	});

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (save.isPending) {
					return;
				}
				onOpenChange(next);
			}}
		>
			<DialogContent className="sm:max-w-md" showCloseButton={!save.isPending}>
				<DialogHeader>
					<DialogTitle>
						{pending ? `Mark as ${READING_LOG_STATUS_LABEL[pending.systemKey]}` : "Update status"}
					</DialogTitle>
					<DialogDescription>
						Set the dates for this attempt, then save. Cancel or close leaves your shelves
						unchanged.
					</DialogDescription>
				</DialogHeader>

				{pending ? (
					<div className="grid gap-4 py-1">
						{isReread ? (
							<div className="flex items-center gap-2">
								<Badge variant="outline" className="font-normal">
									Re-read
								</Badge>
								<p className="text-xs text-muted-foreground">
									You’ve finished this before — logged as a re-read.
								</p>
							</div>
						) : null}

						<div className="grid min-w-0 gap-2">
							<Label htmlFor={`status-started-${workId}`}>Started</Label>
							<DatePicker
								id={`status-started-${workId}`}
								value={startedAt}
								onChange={setStartedAt}
								placeholder="Started date"
								disabled={save.isPending}
								maxDate={today}
							/>
						</div>

						{pending.systemKey !== "reading" ? (
							<div className="grid min-w-0 gap-2">
								<Label htmlFor={`status-finished-${workId}`}>Finished</Label>
								<DatePicker
									id={`status-finished-${workId}`}
									value={finishedAt}
									onChange={setFinishedAt}
									placeholder="Finished date"
									disabled={save.isPending}
									minDate={startedAt}
									maxDate={today}
								/>
							</div>
						) : null}

						{validationError ? <p className="text-sm text-destructive">{validationError}</p> : null}
					</div>
				) : null}

				<DialogFooter>
					<Button variant="outline" disabled={save.isPending} onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						disabled={save.isPending || !pending || Boolean(validationError)}
						onClick={() => save.mutate()}
					>
						{save.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
