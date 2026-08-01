import Link from "next/link";

import { CreateShelfDialog } from "@/components/shelves/create-shelf-dialog";
import { shelfVisibilityLabel } from "@/components/shelves/shelf-visibility-label";
import { Badge } from "@/components/ui/badge";
import type { ShelfSummaryDto } from "@/server/contracts/shelf.contract";

interface ShelvesListProps {
	username: string;
	shelves: ShelfSummaryDto[];
	isOwner: boolean;
}

export function ShelvesList({ username, shelves, isOwner }: ShelvesListProps) {
	return (
		<div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
			<header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div className="space-y-1">
					<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
						@{username}
					</p>
					<h1 className="font-heading text-3xl font-semibold tracking-tight">Shelves</h1>
					<p className="text-sm text-muted-foreground">
						{isOwner
							? "Your reading shelves. System shelves stay put; custom ones are yours to shape."
							: `Public shelves from @${username}.`}
					</p>
				</div>
				{isOwner ? <CreateShelfDialog username={username} /> : null}
			</header>

			{shelves.length === 0 ? (
				<p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
					{isOwner ? "No shelves yet — create one to get started." : "No public shelves to show."}
				</p>
			) : (
				<ul className="grid gap-3 sm:grid-cols-2">
					{shelves.map((shelf) => (
						<li key={shelf.id}>
							<Link
								href={`/users/${username}/shelves/${shelf.slug}`}
								className="flex h-full flex-col gap-2 rounded-lg border p-4 transition-colors hover:bg-muted/40"
							>
								<div className="flex items-start justify-between gap-2">
									<h2 className="font-heading text-lg font-semibold tracking-tight">
										{shelf.name}
									</h2>
									{shelf.isSystem ? (
										<Badge variant="secondary" className="shrink-0 font-normal">
											System
										</Badge>
									) : null}
								</div>
								{shelf.description ? (
									<p className="line-clamp-2 text-sm text-muted-foreground">{shelf.description}</p>
								) : null}
								<p className="mt-auto text-xs text-muted-foreground">
									{shelf.itemCount.toLocaleString()} work
									{shelf.itemCount === 1 ? "" : "s"}
									{" · "}
									{shelfVisibilityLabel(shelf.visibility)}
									{shelf.isOrdered ? " · Ordered" : ""}
								</p>
							</Link>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
