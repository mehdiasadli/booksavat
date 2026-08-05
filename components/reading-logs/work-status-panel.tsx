"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
	type PendingStatusChange,
	StatusCommitDialog,
} from "@/components/reading-logs/status-commit-dialog";
import { WorkDiaryDialog } from "@/components/reading-logs/work-diary-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { client, orpc } from "@/lib/orpc";
import type { LoggableSystemKey } from "@/lib/reading-logs/constants";
import { summarizeReadingHistory } from "@/lib/reading-logs/history";
import { formatReadingLogDates, READING_LOG_STATUS_LABEL } from "@/lib/reading-logs/labels";

interface WorkStatusPanelProps {
	workId: string;
}

function toDate(value: Date | string | null | undefined): Date | null {
	if (!value) {
		return null;
	}
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

export function WorkStatusPanel({ workId }: WorkStatusPanelProps) {
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const queryClient = useQueryClient();
	const enabled = Boolean(session?.user);
	const [pendingStatus, setPendingStatus] = useState<PendingStatusChange | null>(null);
	const [diaryOpen, setDiaryOpen] = useState(false);

	const shelvesQuery = useQuery({
		...orpc.shelf.listByUsername.queryOptions({
			input: { username: session?.user?.username ?? "" },
		}),
		enabled: enabled && Boolean(session?.user?.username),
		staleTime: 30_000,
	});

	const membershipQuery = useQuery({
		...orpc.shelf.membershipForWork.queryOptions({
			input: { workId },
		}),
		enabled,
		staleTime: 15_000,
	});

	const historyQuery = useQuery({
		...orpc.readingLog.listForWork.queryOptions({
			input: { workId },
		}),
		enabled,
		staleTime: 15_000,
	});

	const activeSystemKey =
		membershipQuery.data?.memberships.find((item) => item.isSystem)?.systemKey ?? null;

	const onLoggableShelf =
		activeSystemKey === "reading" || activeSystemKey === "completed" || activeSystemKey === "dnf";

	const activeQuery = useQuery({
		...orpc.readingLog.getActiveForWork.queryOptions({
			input: { workId },
		}),
		enabled: enabled && onLoggableShelf,
		staleTime: 15_000,
	});

	const systemShelves = useMemo(() => {
		const map = new Map<string, { id: string; name: string; systemKey: string }>();
		for (const shelf of shelvesQuery.data?.shelves ?? []) {
			if (shelf.isSystem && shelf.systemKey) {
				map.set(shelf.systemKey, {
					id: shelf.id,
					name: shelf.name,
					systemKey: shelf.systemKey,
				});
			}
		}
		return map;
	}, [shelvesQuery.data?.shelves]);

	const history = summarizeReadingHistory(historyQuery.data?.items ?? []);
	const canReread = history.hasNonRereadFinished && activeSystemKey !== "reading";

	async function invalidate() {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: orpc.shelf.membershipForWork.queryKey({ input: { workId } }),
			}),
			queryClient.invalidateQueries({
				queryKey: orpc.shelf.listByUsername.queryKey({
					input: { username: session?.user?.username ?? "" },
				}),
			}),
			queryClient.invalidateQueries({
				queryKey: orpc.readingLog.getActiveForWork.queryKey({ input: { workId } }),
			}),
			queryClient.invalidateQueries({
				queryKey: orpc.readingLog.listForWork.queryKey({ input: { workId } }),
			}),
		]);
	}

	function openStatus(systemKey: LoggableSystemKey) {
		const shelf = systemShelves.get(systemKey);
		if (!shelf) {
			toast.error("System shelves are still loading");
			return;
		}
		setPendingStatus({
			shelfId: shelf.id,
			systemKey,
			shelfName: shelf.name,
		});
	}

	const wishlist = useMutation({
		mutationFn: async (action: "add" | "remove") => {
			const shelf = systemShelves.get("wishlist");
			if (!shelf) {
				throw new Error("Wishlist shelf not found");
			}
			if (action === "add") {
				return client.shelf.addWork({ shelfId: shelf.id, workId });
			}
			return client.shelf.removeWork({ shelfId: shelf.id, workId });
		},
		onSuccess: async (_data, action) => {
			toast.success(action === "add" ? "Added to wishlist" : "Removed from wishlist");
			await invalidate();
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not update wishlist");
		},
	});

	const clearStatus = useMutation({
		mutationFn: async () => {
			if (!activeSystemKey) {
				return;
			}
			const shelf = systemShelves.get(activeSystemKey);
			if (!shelf) {
				throw new Error("Status shelf not found");
			}
			return client.shelf.removeWork({ shelfId: shelf.id, workId });
		},
		onSuccess: async () => {
			toast.success("Status cleared");
			await invalidate();
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not clear status");
		},
	});

	if (sessionPending) {
		return (
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				<Loader2 className="size-3.5 animate-spin" />
				Loading status…
			</div>
		);
	}

	if (!session?.user) {
		return null;
	}

	const busy = wishlist.isPending || clearStatus.isPending;
	const log = activeQuery.data;
	const showSummary = onLoggableShelf && log;

	return (
		<div className="space-y-3">
			{showSummary ? (
				<div className="flex flex-wrap items-center gap-2 text-sm">
					<Badge variant="secondary" className="font-normal">
						{READING_LOG_STATUS_LABEL[log.status]}
					</Badge>
					{log.isReread ? (
						<Badge variant="outline" className="font-normal">
							Re-read
						</Badge>
					) : null}
					<span className="text-muted-foreground">
						{formatReadingLogDates({
							status: log.status,
							startedAt: toDate(log.startedAt),
							finishedAt: toDate(log.finishedAt),
						})}
					</span>
				</div>
			) : null}

			<div className="flex flex-wrap items-center gap-2">
				{!activeSystemKey || activeSystemKey === "wishlist" ? (
					<>
						{activeSystemKey !== "wishlist" ? (
							<Button
								size="sm"
								variant="outline"
								disabled={busy || !systemShelves.has("wishlist")}
								onClick={() => wishlist.mutate("add")}
							>
								Want to read
							</Button>
						) : (
							<Button
								size="sm"
								variant="outline"
								disabled={busy}
								onClick={() => wishlist.mutate("remove")}
							>
								Remove wishlist
							</Button>
						)}

						<Button
							size="sm"
							disabled={busy || !systemShelves.has("reading")}
							onClick={() => openStatus("reading")}
						>
							Start reading
						</Button>

						<div className="flex items-center">
							<Button
								size="sm"
								variant="secondary"
								className="rounded-r-none"
								disabled={busy || !systemShelves.has("completed")}
								onClick={() => openStatus("completed")}
							>
								Mark finished
							</Button>
							<DropdownMenu>
								<DropdownMenuTrigger
									render={
										<Button
											size="sm"
											variant="secondary"
											className="rounded-l-none border-l border-l-border/60 px-2"
											disabled={busy || !systemShelves.has("dnf")}
											aria-label="More finish options"
										/>
									}
								>
									<ChevronDown className="size-3.5" />
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem onClick={() => openStatus("dnf")}>
										Did not finish
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</>
				) : null}

				{activeSystemKey === "reading" ? (
					<>
						<div className="flex items-center">
							<Button
								size="sm"
								disabled={busy || !systemShelves.has("completed")}
								className="rounded-r-none"
								onClick={() => openStatus("completed")}
							>
								Complete
							</Button>
							<DropdownMenu>
								<DropdownMenuTrigger
									render={
										<Button
											size="sm"
											className="rounded-l-none border-l border-l-primary-foreground/20 px-2"
											disabled={busy || !systemShelves.has("dnf")}
											aria-label="More finish options"
										/>
									}
								>
									<ChevronDown className="size-3.5" />
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem onClick={() => openStatus("dnf")}>
										Did not finish
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
						<Button size="sm" variant="outline" onClick={() => setDiaryOpen(true)}>
							Edit diary
						</Button>
						<Button size="sm" variant="ghost" disabled={busy} onClick={() => clearStatus.mutate()}>
							Clear
						</Button>
					</>
				) : null}

				{activeSystemKey === "completed" || activeSystemKey === "dnf" ? (
					<>
						{canReread ? (
							<Button
								size="sm"
								disabled={busy || !systemShelves.has("reading")}
								onClick={() => openStatus("reading")}
							>
								Re-read
							</Button>
						) : null}
						<Button size="sm" variant="outline" onClick={() => setDiaryOpen(true)}>
							Edit diary
						</Button>
						<Button size="sm" variant="ghost" disabled={busy} onClick={() => clearStatus.mutate()}>
							Clear
						</Button>
					</>
				) : null}
			</div>

			<StatusCommitDialog
				workId={workId}
				pending={pendingStatus}
				onOpenChange={(open) => {
					if (!open) {
						setPendingStatus(null);
					}
				}}
				onCommitted={() => {
					void invalidate();
				}}
			/>

			<WorkDiaryDialog workId={workId} open={diaryOpen} onOpenChange={setDiaryOpen} />
		</div>
	);
}
