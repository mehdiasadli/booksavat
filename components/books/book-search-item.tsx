import Link from "next/link";

import { BookCover } from "@/components/books/book-cover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BookSearchItem as BookSearchItemData } from "@/server/contracts/book.contract";

interface BookSearchItemProps {
	book: BookSearchItemData;
	onSelect?: () => void;
	className?: string;
}

export function BookSearchItem({ book, onSelect, className }: BookSearchItemProps) {
	const meta = [
		book.authors.slice(0, 2).join(", ") || null,
		book.firstPublishYear ? String(book.firstPublishYear) : null,
	]
		.filter(Boolean)
		.join(" · ");

	return (
		<Link
			href={`/books/${book.workId}`}
			onClick={onSelect}
			className={cn(
				"flex gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:outline-none",
				className,
			)}
		>
			<BookCover src={book.coverUrl} alt={book.title} size="sm" />
			<div className="min-w-0 flex-1">
				<p className="truncate font-medium leading-snug">{book.title}</p>
				{book.subtitle ? (
					<p className="truncate text-xs text-muted-foreground">{book.subtitle}</p>
				) : null}
				{meta ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p> : null}
				{book.excerpt ? (
					<p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{book.excerpt}</p>
				) : null}
				{book.subjects.length > 0 ? (
					<div className="mt-1.5 flex flex-wrap gap-1">
						{book.subjects.slice(0, 3).map((subject) => (
							<Badge key={subject} variant="secondary" className="max-w-28 truncate font-normal">
								{subject}
							</Badge>
						))}
					</div>
				) : null}
			</div>
		</Link>
	);
}
