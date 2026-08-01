import Link from "next/link";

import { ShelfSettingsMenu } from "@/components/shelves/shelf-settings-menu";
import { shelfVisibilityLabel } from "@/components/shelves/shelf-visibility-label";
import { SortableShelfItems } from "@/components/shelves/sortable-shelf-items";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ShelfItemPreviewDto, ShelfSummaryDto } from "@/server/contracts/shelf.contract";

interface ShelfDetailProps {
	username: string;
	shelf: ShelfSummaryDto;
	items: ShelfItemPreviewDto[];
	total: number;
	isOwner: boolean;
}

export function ShelfDetail({ username, shelf, items, total, isOwner }: ShelfDetailProps) {
	return (
		<article className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
			<div className="space-y-3">
				<Button
					variant="ghost"
					size="sm"
					className="-ml-2 w-fit"
					nativeButton={false}
					render={<Link href={`/users/${username}/shelves`}>All shelves</Link>}
				/>

				<header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="space-y-2">
						<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
							@{username}
						</p>
						<div className="flex flex-wrap items-center gap-2">
							<h1 className="font-heading text-3xl font-semibold tracking-tight">{shelf.name}</h1>
							{shelf.isSystem ? (
								<Badge variant="secondary" className="font-normal">
									System
								</Badge>
							) : null}
						</div>
						{shelf.description ? (
							<p className="max-w-2xl text-sm text-muted-foreground text-pretty">
								{shelf.description}
							</p>
						) : null}
						<p className="text-xs text-muted-foreground">
							{total.toLocaleString()} work{total === 1 ? "" : "s"}
							{" · "}
							{shelfVisibilityLabel(shelf.visibility)}
							{shelf.isOrdered ? " · Ordered" : " · Unordered"}
						</p>
					</div>

					{isOwner ? <ShelfSettingsMenu username={username} shelf={shelf} /> : null}
				</header>
			</div>

			<SortableShelfItems
				shelfId={shelf.id}
				isOrdered={shelf.isOrdered}
				isOwner={isOwner}
				items={items}
			/>
		</article>
	);
}
