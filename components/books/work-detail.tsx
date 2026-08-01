import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { BookCover } from "@/components/books/book-cover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { BookEditionSummary, BookWorkDetail } from "@/server/contracts/book.contract";

interface WorkDetailProps {
	work: BookWorkDetail;
	editions: BookEditionSummary[];
	editionTotal: number;
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

export function WorkDetail({ work, editions, editionTotal }: WorkDetailProps) {
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

					<div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
						{work.firstPublishDate ? <span>First published {work.firstPublishDate}</span> : null}
						{work.editionCount != null ? (
							<span>
								{work.editionCount.toLocaleString()} edition
								{work.editionCount === 1 ? "" : "s"}
							</span>
						) : null}
						<span className="font-mono text-xs">{work.workId}</span>
					</div>

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

			<section className="space-y-4">
				<div className="flex items-end justify-between gap-3">
					<div>
						<h2 className="font-heading text-lg font-semibold tracking-tight">Editions</h2>
						<p className="text-sm text-muted-foreground">
							{editionTotal > 0
								? `Showing ${editions.length} of ${editionTotal.toLocaleString()}`
								: "No editions listed yet"}
						</p>
					</div>
				</div>

				{editions.length === 0 ? (
					<p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
						We couldn’t find editions for this work right now.
					</p>
				) : (
					<ul className="grid gap-3 sm:grid-cols-2">
						{editions.map((edition) => (
							<li key={edition.editionId}>
								<Link
									href={`/books/edition/${edition.editionId}`}
									className="flex gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40"
								>
									<BookCover src={edition.coverUrl} alt={edition.title} size="sm" />
									<div className="min-w-0 flex-1 space-y-1">
										<p className="truncate font-medium">{edition.title}</p>
										{edition.publishDate || edition.publishers[0] ? (
											<p className="truncate text-xs text-muted-foreground">
												{[edition.publishDate, edition.publishers[0]].filter(Boolean).join(" · ")}
											</p>
										) : null}
										{(edition.isbn13[0] || edition.isbn10[0]) && (
											<p className="font-mono text-[11px] text-muted-foreground">
												ISBN {edition.isbn13[0] ?? edition.isbn10[0]}
											</p>
										)}
										{edition.pageCount != null ? (
											<p className="text-xs text-muted-foreground">{edition.pageCount} pages</p>
										) : null}
									</div>
								</Link>
							</li>
						))}
					</ul>
				)}
			</section>
		</article>
	);
}
