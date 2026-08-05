import Link from "next/link";

import { BookCover } from "@/components/books/book-cover";
import { Badge } from "@/components/ui/badge";
import { formatReadingLogDates, READING_LOG_STATUS_LABEL } from "@/lib/reading-logs/labels";
import type { ReadingLogDto } from "@/server/contracts/reading-log.contract";

interface DiaryListProps {
	username: string;
	items: ReadingLogDto[];
}

export function DiaryList({ username, items }: DiaryListProps) {
	return (
		<div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
			<header className="space-y-1">
				<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
					@{username}
				</p>
				<h1 className="font-heading text-3xl font-semibold tracking-tight">Diary</h1>
				<p className="text-sm text-muted-foreground">
					Your reading history — one entry per attempt, including re-reads.
				</p>
			</header>

			{items.length === 0 ? (
				<p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
					No reading logs yet. Move a book to Reading, Completed, or DNF to start one.
				</p>
			) : (
				<ul className="flex flex-col gap-3">
					{items.map((log) => (
						<li key={log.id}>
							<Link
								href={`/books/${log.workId}`}
								className="flex gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/40"
							>
								<BookCover src={log.coverUrl} alt={log.title} size="sm" />
								<div className="min-w-0 flex-1 space-y-1.5">
									<div className="flex flex-wrap items-center gap-2">
										<h2 className="font-heading text-base font-semibold tracking-tight truncate">
											{log.title}
										</h2>
										<Badge variant="secondary" className="shrink-0 font-normal">
											{READING_LOG_STATUS_LABEL[log.status]}
										</Badge>
										{log.isReread ? (
											<Badge variant="outline" className="shrink-0 font-normal">
												Re-read
											</Badge>
										) : null}
									</div>
									<p className="text-xs text-muted-foreground">
										{formatReadingLogDates({
											status: log.status,
											startedAt: log.startedAt,
											finishedAt: log.finishedAt,
										})}
									</p>
								</div>
							</Link>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
