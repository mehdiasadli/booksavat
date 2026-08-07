import Link from "next/link";

import { BookCover } from "@/components/books/book-cover";
import type { AuthorWorkSummary } from "@/server/contracts/author.contract";

interface WorkOtherWorksProps {
	authorName: string;
	authorId: string;
	works: AuthorWorkSummary[];
}

export function WorkOtherWorks({ authorName, authorId, works }: WorkOtherWorksProps) {
	if (works.length === 0) {
		return null;
	}

	return (
		<section className="space-y-4">
			<div className="flex items-baseline justify-between gap-3">
				<h2 className="font-heading text-lg font-semibold tracking-tight">More by {authorName}</h2>
				<Link
					href={`/authors/${authorId}`}
					className="text-sm text-muted-foreground underline-offset-4 hover:underline"
				>
					See all
				</Link>
			</div>

			<ul className="grid gap-3 sm:grid-cols-2">
				{works.map((work) => (
					<li key={work.workId}>
						<Link
							href={`/books/${work.workId}`}
							className="flex h-full gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40"
						>
							<BookCover src={work.coverUrl} alt={work.title} size="sm" />
							<div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
								<p className="truncate font-medium">{work.title}</p>
								<p className="truncate text-xs text-muted-foreground">
									{work.firstPublishDate || work.workId}
								</p>
							</div>
						</Link>
					</li>
				))}
			</ul>
		</section>
	);
}
