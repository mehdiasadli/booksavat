"use client";

import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation } from "@tanstack/react-query";
import { GripVertical, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BookCover } from "@/components/books/book-cover";
import { Button } from "@/components/ui/button";
import { client } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import type { ShelfItemPreviewDto } from "@/server/contracts/shelf.contract";

interface SortableShelfItemsProps {
	shelfId: string;
	isOrdered: boolean;
	isOwner: boolean;
	items: ShelfItemPreviewDto[];
}

function SortableRow({
	item,
	isOrdered,
	isOwner,
	onRemove,
}: {
	item: ShelfItemPreviewDto;
	isOrdered: boolean;
	isOwner: boolean;
	onRemove: (workId: string) => void;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: item.workId,
		disabled: !isOrdered || !isOwner,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<li
			ref={setNodeRef}
			style={style}
			className={cn(
				"flex items-center gap-3 rounded-lg border bg-background p-3",
				isDragging && "z-10 opacity-80 shadow-md",
			)}
		>
			{isOrdered && isOwner ? (
				<button
					type="button"
					className="touch-none text-muted-foreground hover:text-foreground"
					aria-label="Drag to reorder"
					{...attributes}
					{...listeners}
				>
					<GripVertical className="size-4" />
				</button>
			) : isOrdered ? (
				<span className="w-6 text-center font-mono text-xs text-muted-foreground">
					{item.position + 1}
				</span>
			) : null}

			<Link href={`/books/${item.workId}`} className="flex min-w-0 flex-1 items-center gap-3">
				<BookCover src={item.coverUrl} alt={item.title} size="sm" />
				<div className="min-w-0">
					<p className="truncate font-medium">{item.title}</p>
					<p className="font-mono text-[11px] text-muted-foreground">{item.workId}</p>
				</div>
			</Link>

			{isOwner ? (
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					aria-label={`Remove ${item.title}`}
					onClick={() => onRemove(item.workId)}
				>
					<X className="size-3.5" />
				</Button>
			) : null}
		</li>
	);
}

export function SortableShelfItems({
	shelfId,
	isOrdered,
	isOwner,
	items: initialItems,
}: SortableShelfItemsProps) {
	const router = useRouter();
	const [items, setItems] = useState(initialItems);

	useEffect(() => {
		setItems(initialItems);
	}, [initialItems]);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	const reorder = useMutation({
		mutationFn: (workIds: string[]) => client.shelf.reorderItems({ shelfId, workIds }),
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not reorder");
			setItems(initialItems);
		},
		onSuccess: () => {
			router.refresh();
		},
	});

	const remove = useMutation({
		mutationFn: (workId: string) => client.shelf.removeWork({ shelfId, workId }),
		onSuccess: (_data, workId) => {
			setItems((current) => current.filter((item) => item.workId !== workId));
			toast.success("Removed from shelf");
			router.refresh();
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Could not remove work");
		},
	});

	function onDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (!over || active.id === over.id) {
			return;
		}

		const oldIndex = items.findIndex((item) => item.workId === active.id);
		const newIndex = items.findIndex((item) => item.workId === over.id);
		if (oldIndex < 0 || newIndex < 0) {
			return;
		}

		const next = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
			...item,
			position: index,
		}));
		setItems(next);
		reorder.mutate(next.map((item) => item.workId));
	}

	if (items.length === 0) {
		return (
			<p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
				This shelf is empty.
			</p>
		);
	}

	const list = (
		<ul className="flex flex-col gap-2">
			{items.map((item) => (
				<SortableRow
					key={item.workId}
					item={item}
					isOrdered={isOrdered}
					isOwner={isOwner}
					onRemove={(workId) => remove.mutate(workId)}
				/>
			))}
		</ul>
	);

	if (!isOrdered || !isOwner) {
		return list;
	}

	return (
		<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
			<SortableContext
				items={items.map((item) => item.workId)}
				strategy={verticalListSortingStrategy}
			>
				{list}
			</SortableContext>
		</DndContext>
	);
}
