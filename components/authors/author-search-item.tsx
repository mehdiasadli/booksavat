"use client";

import Link from "next/link";

import { AuthorPhoto } from "@/components/authors/author-photo";
import { cn } from "@/lib/utils";
import type { AuthorSearchItem as AuthorSearchItemData } from "@/server/contracts/author.contract";

interface AuthorSearchItemProps {
	author: AuthorSearchItemData;
	onSelect?: () => void;
	className?: string;
}

export function AuthorSearchItem({ author, onSelect, className }: AuthorSearchItemProps) {
	const dates = [author.birthDate, author.deathDate].filter(Boolean).join(" – ");
	const meta =
		[dates || null, author.workCount != null ? `${author.workCount.toLocaleString()} works` : null]
			.filter(Boolean)
			.join(" · ") || author.topWork;

	return (
		<Link
			href={`/authors/${author.authorId}`}
			onClick={onSelect}
			className={cn(
				"flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/70",
				className,
			)}
		>
			<AuthorPhoto src={author.photoUrl} alt={author.name} size="sm" />
			<div className="min-w-0 flex-1">
				<p className="truncate font-medium leading-snug">{author.name}</p>
				{meta ? <p className="truncate text-xs text-muted-foreground">{meta}</p> : null}
			</div>
		</Link>
	);
}
