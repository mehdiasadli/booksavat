import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { AuthorPhoto } from "@/components/authors/author-photo";
import { AuthorWorks } from "@/components/authors/author-works";
import { Button } from "@/components/ui/button";
import type {
	AuthorDetail as AuthorDetailData,
	AuthorWorkSummary,
} from "@/server/contracts/author.contract";

interface AuthorDetailProps {
	author: AuthorDetailData;
	works: AuthorWorkSummary[];
	workTotal: number;
	workNextOffset: number | null;
}

function lifespan(author: AuthorDetailData): string | null {
	if (!author.birthDate && !author.deathDate) {
		return null;
	}

	return [author.birthDate ?? "?", author.deathDate ?? ""].filter(Boolean).join(" – ");
}

export function AuthorDetail({ author, works, workTotal, workNextOffset }: AuthorDetailProps) {
	const dates = lifespan(author);

	return (
		<article className="space-y-8">
			<div className="flex flex-col gap-6 sm:flex-row sm:items-start">
				<AuthorPhoto
					src={author.photoUrl}
					alt={author.name}
					size="xl"
					className="mx-auto sm:mx-0"
					priority
				/>

				<div className="min-w-0 flex-1 space-y-4">
					<div className="space-y-2">
						<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
							Author
						</p>
						<h1 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
							{author.name}
						</h1>
						{dates ? <p className="text-sm text-muted-foreground">{dates}</p> : null}
					</div>

					<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
						{workTotal > 0 ? (
							<span>
								{workTotal.toLocaleString()} work{workTotal === 1 ? "" : "s"}
							</span>
						) : null}
						<span className="font-mono">{author.authorId}</span>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							nativeButton={false}
							render={
								<a href={author.openLibraryUrl} target="_blank" rel="noreferrer">
									Open Library
									<ExternalLink className="size-3.5" />
								</a>
							}
						/>
						{author.wikipedia ? (
							<Button
								variant="ghost"
								size="sm"
								nativeButton={false}
								render={
									<a href={author.wikipedia} target="_blank" rel="noreferrer">
										Wikipedia
										<ExternalLink className="size-3.5" />
									</a>
								}
							/>
						) : null}
					</div>

					{author.alternateNames.length > 0 ? (
						<p className="text-sm text-muted-foreground">
							<span className="text-foreground">Also known as </span>
							{author.alternateNames.slice(0, 8).join(", ")}
						</p>
					) : null}
				</div>
			</div>

			{author.bio ? (
				<section className="w-full max-w-3xl min-w-0 space-y-2">
					<h2 className="font-heading text-lg font-semibold tracking-tight">About</h2>
					<p className="max-w-full min-w-0 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground text-pretty [overflow-wrap:anywhere]">
						{author.bio}
					</p>
				</section>
			) : null}

			<AuthorWorks
				authorId={author.authorId}
				initialItems={works}
				initialTotal={workTotal}
				initialNextOffset={workNextOffset}
			/>

			<p className="text-center text-sm text-muted-foreground">
				Looking for a title?{" "}
				<Link href="/books" className="underline underline-offset-4 hover:text-foreground">
					Search books
				</Link>
			</p>
		</article>
	);
}
