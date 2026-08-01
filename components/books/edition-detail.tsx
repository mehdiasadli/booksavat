import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

import { BookCover } from "@/components/books/book-cover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BookEditionDetail } from "@/server/contracts/book.contract";

interface EditionDetailProps {
	edition: BookEditionDetail;
}

function Fact({ label, value }: { label: string; value?: string | number | null }) {
	if (value == null || value === "") {
		return null;
	}

	return (
		<div className="space-y-1">
			<dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
			<dd className="text-sm">{value}</dd>
		</div>
	);
}

export function EditionDetail({ edition }: EditionDetailProps) {
	const isbns = [...edition.isbn13, ...edition.isbn10];

	return (
		<article className="space-y-8">
			{edition.workId ? (
				<Button
					variant="ghost"
					size="sm"
					className="-ml-2 w-fit"
					nativeButton={false}
					render={
						<Link href={`/books/${edition.workId}`}>
							<ArrowLeft className="size-4" />
							{edition.workTitle ? `Back to ${edition.workTitle}` : "Back to work"}
						</Link>
					}
				/>
			) : null}

			<div className="flex flex-col gap-6 sm:flex-row sm:items-start">
				<BookCover
					src={edition.coverUrl}
					alt={edition.title}
					size="xl"
					className="mx-auto sm:mx-0"
					priority
				/>

				<div className="min-w-0 flex-1 space-y-4">
					<div className="space-y-2">
						<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
							Edition
						</p>
						<h1 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
							{edition.title}
						</h1>
						{edition.subtitle ? (
							<p className="text-lg text-muted-foreground text-pretty">{edition.subtitle}</p>
						) : null}
					</div>

					<div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
						{edition.publishDate ? <span>{edition.publishDate}</span> : null}
						{edition.pageCount != null ? <span>{edition.pageCount} pages</span> : null}
						<span className="font-mono text-xs">{edition.editionId}</span>
					</div>

					<Button
						variant="outline"
						size="sm"
						nativeButton={false}
						render={
							<a href={edition.openLibraryUrl} target="_blank" rel="noreferrer">
								Open Library
								<ExternalLink className="size-3.5" />
							</a>
						}
					/>
				</div>
			</div>

			{edition.description ? (
				<section className="max-w-3xl space-y-2">
					<h2 className="font-heading text-lg font-semibold tracking-tight">About this edition</h2>
					<p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground text-pretty">
						{edition.description}
					</p>
				</section>
			) : null}

			<section className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2 md:grid-cols-3">
				<Fact label="Publishers" value={edition.publishers.join(", ") || null} />
				<Fact label="Publish places" value={edition.publishPlaces.join(", ") || null} />
				<Fact label="Physical format" value={edition.physicalFormat} />
				<Fact label="Pagination" value={edition.pagination} />
				<Fact label="Weight" value={edition.weight} />
				<Fact label="Languages" value={edition.languages.join(", ") || null} />
			</section>

			{isbns.length > 0 ? (
				<section className="space-y-2">
					<h2 className="font-heading text-sm font-semibold tracking-tight">Identifiers</h2>
					<div className="flex flex-wrap gap-1.5">
						{isbns.map((isbn) => (
							<Badge key={isbn} variant="outline" className="font-mono font-normal">
								ISBN {isbn}
							</Badge>
						))}
					</div>
				</section>
			) : null}
		</article>
	);
}
