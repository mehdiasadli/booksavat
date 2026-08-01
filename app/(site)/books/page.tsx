import type { Metadata } from "next";

import { BookSearch } from "@/components/books/book-search";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
	title: "Books",
	description: "Search Open Library works and explore editions on BookSavat.",
	path: "/books",
});

export default function BooksPage() {
	return (
		<section className="mx-auto flex max-w-2xl flex-col gap-6 py-6 sm:py-12">
			<div className="space-y-2 text-center">
				<h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
					Find a book
				</h1>
				<p className="text-sm text-muted-foreground text-pretty sm:text-base">
					Search millions of works from Open Library. Pick a title to see details, subjects, and
					editions.
				</p>
			</div>
			<BookSearch />
		</section>
	);
}
