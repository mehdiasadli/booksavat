import { ExternalLink } from "lucide-react";

import { BookCover } from "@/components/books/book-cover";
import { WorkEditions } from "@/components/books/work-editions";
import { AddToShelf } from "@/components/shelves/add-to-shelf";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { BookEditionSummary, BookWorkDetail } from "@/server/contracts/book.contract";

interface WorkDetailProps {
	work: BookWorkDetail;
	editions: BookEditionSummary[];
	editionTotal: number;
	editionNextOffset: number | null;
}

function MetaList({ label, values }: { label: string; values: string[] }) {
	if (values.length === 0) {
		return null;
	}

	return (
		<section className="space-y-2">
			<h2 className="font-heading text-sm font-semibold tracking-tight">{label}</h2>
			<div className="flex flex-wrap gap-1.5">
				{values.slice(0, 24).map((value) => (
					<Badge key={value} variant="secondary" className="font-normal">
						{value}
					</Badge>
				))}
			</div>
		</section>
	);
}

export function WorkDetail({ work, editions, editionTotal, editionNextOffset }: WorkDetailProps) {
	return (
		<article className="space-y-8">
			<div className="flex flex-col gap-6 sm:flex-row sm:items-start">
				<BookCover
					src={work.coverUrl}
					alt={work.title}
					size="xl"
					className="mx-auto sm:mx-0"
					priority
				/>

				<div className="min-w-0 flex-1 space-y-4">
					<div className="space-y-2">
						<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
							Work
						</p>
						<h1 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
							{work.title}
						</h1>
						{work.subtitle ? (
							<p className="text-lg text-muted-foreground text-pretty">{work.subtitle}</p>
						) : null}
					</div>

					{work.authors.length > 0 ? (
						<p className="text-sm text-muted-foreground">
							<span className="text-foreground">By </span>
							{work.authors.join(", ")}
						</p>
					) : null}

					<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
						{work.firstPublishDate ? <span>First published {work.firstPublishDate}</span> : null}
						{work.editionCount != null ? (
							<span>
								{work.editionCount.toLocaleString()} edition
								{work.editionCount === 1 ? "" : "s"}
							</span>
						) : null}
						<span className="font-mono">{work.workId}</span>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<AddToShelf workId={work.workId} />
						<Button
							variant="outline"
							size="sm"
							nativeButton={false}
							render={
								<a href={work.openLibraryUrl} target="_blank" rel="noreferrer">
									Open Library
									<ExternalLink className="size-3.5" />
								</a>
							}
						/>
					</div>
				</div>
			</div>

			{work.description ? (
				<section className="max-w-3xl space-y-2">
					<h2 className="font-heading text-lg font-semibold tracking-tight">About</h2>
					<p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground text-pretty">
						{work.description}
					</p>
				</section>
			) : null}

			<div className="grid gap-6 md:grid-cols-2">
				<MetaList label="Subjects" values={work.subjects} />
				<MetaList label="Places" values={work.subjectPlaces} />
				<MetaList label="People" values={work.subjectPeople} />
				<MetaList label="Times" values={work.subjectTimes} />
			</div>

			<Separator />

			<WorkEditions
				workId={work.workId}
				initialItems={editions}
				initialTotal={editionTotal}
				initialNextOffset={editionNextOffset}
			/>
		</article>
	);
}
