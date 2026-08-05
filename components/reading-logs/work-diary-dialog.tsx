"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
	type PendingStatusChange,
	StatusCommitDialog,
} from "@/components/reading-logs/status-commit-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { authClient } from "@/lib/auth-client";
import { client, orpc } from "@/lib/orpc";
import { summarizeReadingHistory } from "@/lib/reading-logs/history";
import { formatReadingLogDates, READING_LOG_STATUS_LABEL } from "@/lib/reading-logs/labels";
import { startOfLocalDay, validateReadingLogInput } from "@/lib/reading-logs/validation";
import type { ReadingLogDto } from "@/server/contracts/reading-log.contract";

interface WorkDiaryDialogProps {
	workId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

function toDate(value: Date | string | null | undefined): Date | null {
	if (!value) {
		return null;
	}
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function LogEditForm({
	log,
	allLogs,
	onSaved,
}: {
	log: ReadingLogDto;
	allLogs: ReadingLogDto[];
	onSaved: () => void;
}) {
	const [startedAt, setStartedAt] = useState<Date | null>(toDate(log.startedAt));
	const [finishedAt, setFinishedAt] = useState<Date | null>(toDate(log.finishedAt));
	const [isReread, setIsReread] = useState(log.isReread);
	const today = startOfLocalDay(new Date());

	useEffect(() => {
		setStartedAt(toDate(log.startedAt));
		setFinishedAt(toDate(log.finishedAt));
		setIsReread(log.isReread);
	}, [log]);

	const history = useMemo(
		() => summarizeReadingHistory(allLogs, { excludeLogId: log.id }),
		[allLogs, log.id],
	);

	const isExistingFirstFinished =
		(log.status === "completed" || log.status === "dnf") && !log.isReread;

	const canToggleReread = history.hasNonRereadFinished || isExistingFirstFinished;
	const showReread = history.hasPriorFinished || log.isReread || isExistingFirstFinished;

	const validationError = validateReadingLogInput(
		{
			status: log.status,
			startedAt,
			finishedAt: log.status === "reading" ? null : finishedAt,
		},
		{
			isReread,
			hasPriorFinished: history.hasPriorFinished,
			hasNonRereadFinished: history.hasNonRereadFinished,
			isExistingFirstFinished,
		},
	);

	const update = useMutation({
		mutationFn: () => {
			if (validationError) {
				throw new Error(validationError);
			}
			return client.readingLog.update({
				logId: log.id,
				startedAt,
				finishedAt: log.status === "reading" ? null : finishedAt,
				isReread,
			});
		},
		onSuccess: () => {
			toast.success("Log updated");
			onSaved();
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not update log");
		},
	});

	return (
		<div className="min-w-0 space-y-3 rounded-lg border p-3">
			<div className="flex flex-wrap items-center gap-2">
				<Badge variant="secondary" className="font-normal">
					{READING_LOG_STATUS_LABEL[log.status]}
				</Badge>
				{log.isReread ? (
					<Badge variant="outline" className="font-normal">
						Re-read
					</Badge>
				) : null}
				<span className="text-xs text-muted-foreground">
					{formatReadingLogDates({
						status: log.status,
						startedAt: toDate(log.startedAt),
						finishedAt: toDate(log.finishedAt),
					})}
				</span>
			</div>

			<div className="grid min-w-0 gap-3 sm:grid-cols-2">
				<div className="grid min-w-0 gap-2">
					<Label>Started</Label>
					<DatePicker
						value={startedAt}
						onChange={setStartedAt}
						placeholder="Started date"
						disabled={update.isPending}
						maxDate={today}
					/>
				</div>
				{log.status !== "reading" ? (
					<div className="grid min-w-0 gap-2">
						<Label>Finished</Label>
						<DatePicker
							value={finishedAt}
							onChange={setFinishedAt}
							placeholder="Finished date"
							disabled={update.isPending}
							minDate={startedAt}
							maxDate={today}
						/>
					</div>
				) : null}
			</div>

			{showReread ? (
				<label className="flex items-center gap-2 text-sm">
					<Checkbox
						checked={isReread}
						disabled={update.isPending || !canToggleReread}
						onCheckedChange={(checked) => setIsReread(checked === true)}
					/>
					Re-read
				</label>
			) : null}

			{validationError ? <p className="text-sm text-destructive">{validationError}</p> : null}

			<Button
				size="sm"
				disabled={update.isPending || Boolean(validationError)}
				onClick={() => update.mutate()}
			>
				{update.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
				Save changes
			</Button>
		</div>
	);
}

export function WorkDiaryDialog({ workId, open, onOpenChange }: WorkDiaryDialogProps) {
	const { data: session } = authClient.useSession();
	const queryClient = useQueryClient();
	const [pendingStatus, setPendingStatus] = useState<PendingStatusChange | null>(null);

	const historyQuery = useQuery({
		...orpc.readingLog.listForWork.queryOptions({
			input: { workId },
		}),
		enabled: open,
		staleTime: 10_000,
	});

	const membershipQuery = useQuery({
		...orpc.shelf.membershipForWork.queryOptions({
			input: { workId },
		}),
		enabled: open,
		staleTime: 10_000,
	});

	const shelvesQuery = useQuery({
		...orpc.shelf.listByUsername.queryOptions({
			input: { username: session?.user?.username ?? "" },
		}),
		enabled: open && Boolean(session?.user?.username),
		staleTime: 30_000,
	});

	async function invalidate() {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: orpc.readingLog.listForWork.queryKey({ input: { workId } }),
			}),
			queryClient.invalidateQueries({
				queryKey: orpc.readingLog.getActiveForWork.queryKey({ input: { workId } }),
			}),
			queryClient.invalidateQueries({
				queryKey: orpc.shelf.membershipForWork.queryKey({ input: { workId } }),
			}),
		]);
	}

	const activeSystemKey =
		membershipQuery.data?.memberships.find((item) => item.isSystem)?.systemKey ?? null;
	const history = summarizeReadingHistory(historyQuery.data?.items ?? []);
	const canStartReread = history.hasNonRereadFinished && activeSystemKey !== "reading";

	const readingShelf = shelvesQuery.data?.shelves.find(
		(shelf) => shelf.isSystem && shelf.systemKey === "reading",
	);

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="overflow-x-hidden sm:max-w-lg" showCloseButton>
					<DialogHeader>
						<DialogTitle>Book diary</DialogTitle>
						<DialogDescription>
							View and edit reading attempts for this work. Changes save per entry.
						</DialogDescription>
					</DialogHeader>

					<div className="max-h-[60vh] min-w-0 space-y-3 overflow-x-hidden overflow-y-auto py-1">
						{historyQuery.isLoading ? (
							<p className="flex items-center gap-2 text-sm text-muted-foreground">
								<Loader2 className="size-3.5 animate-spin" />
								Loading logs…
							</p>
						) : historyQuery.data?.items.length ? (
							historyQuery.data.items.map((log) => (
								<LogEditForm
									key={log.id}
									log={log}
									allLogs={historyQuery.data.items}
									onSaved={invalidate}
								/>
							))
						) : (
							<p className="text-sm text-muted-foreground">No reading logs for this book yet.</p>
						)}
					</div>

					<DialogFooter className="sm:justify-between">
						{canStartReread ? (
							<Button
								variant="outline"
								disabled={!readingShelf}
								onClick={() => {
									if (!readingShelf) {
										return;
									}
									onOpenChange(false);
									setPendingStatus({
										shelfId: readingShelf.id,
										systemKey: "reading",
										shelfName: readingShelf.name,
									});
								}}
							>
								Start re-read
							</Button>
						) : (
							<span />
						)}
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Done
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<StatusCommitDialog
				workId={workId}
				pending={pendingStatus}
				onOpenChange={(next) => {
					if (!next) {
						setPendingStatus(null);
					}
				}}
				onCommitted={() => {
					void invalidate();
				}}
			/>
		</>
	);
}
