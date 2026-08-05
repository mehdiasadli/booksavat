"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { StarIcon } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

const ratingVariants = cva("flex items-center", {
	variants: {
		size: {
			sm: "gap-2",
			default: "gap-2.5",
			lg: "gap-3",
		},
	},
	defaultVariants: {
		size: "default",
	},
});

const starVariants = cva("", {
	variants: {
		size: {
			sm: "size-4",
			default: "size-5",
			lg: "size-6",
		},
	},
	defaultVariants: {
		size: "default",
	},
});

const valueVariants = cva("w-6 text-muted-foreground tabular-nums", {
	variants: {
		size: {
			sm: "text-xs",
			default: "text-sm",
			lg: "text-base",
		},
	},
	defaultVariants: {
		size: "default",
	},
});

function snapToStep(value: number, step: number, max: number): number {
	const snapped = Math.round(value / step) * step;
	return Math.min(max, Math.max(0, Number(snapped.toFixed(1))));
}

function Rating({
	rating,
	maxRating = 5,
	step = 0.5,
	size,
	className,
	starClassName,
	showValue = false,
	editable = false,
	allowZero = true,
	onRatingChange,
	...props
}: React.ComponentProps<"div"> &
	VariantProps<typeof ratingVariants> & {
		/** Current rating (supports decimals for partial stars). */
		rating: number;
		/** Maximum rating / star count. */
		maxRating?: number;
		/** Selection precision when editable (default half-stars). */
		step?: number;
		showValue?: boolean;
		starClassName?: string;
		editable?: boolean;
		/** Allow selecting 0 by clicking the current half-star again on the first star. */
		allowZero?: boolean;
		onRatingChange?: (rating: number) => void;
	}) {
	const [hoveredRating, setHoveredRating] = useState<number | null>(null);
	const displayRating = editable && hoveredRating !== null ? hoveredRating : rating;

	function valueFromPointer(starIndex: number, clientX: number, target: HTMLElement) {
		const rect = target.getBoundingClientRect();
		const ratio = (clientX - rect.left) / rect.width;
		const raw = starIndex - 1 + (ratio <= 0.5 ? step : 1);
		return snapToStep(raw, step, maxRating);
	}

	function commitValue(next: number) {
		if (!editable || !onRatingChange) {
			return;
		}
		if (allowZero && next === rating && next === step) {
			onRatingChange(0);
			return;
		}
		onRatingChange(next);
	}

	const stars = [];
	for (let i = 1; i <= maxRating; i++) {
		const filled = displayRating >= i;
		const partiallyFilled = displayRating > i - 1 && displayRating < i;
		const fillPercentage = partiallyFilled ? (displayRating - (i - 1)) * 100 : 0;
		const starClass = cn("relative inline-flex", editable && "cursor-pointer");
		const starBody = (
			<>
				<StarIcon
					data-slot="rating-star-empty"
					className={cn(starVariants({ size }), "text-muted-foreground/30")}
					aria-hidden
				/>
				<div
					className="absolute inset-0 overflow-hidden"
					style={{ width: filled ? "100%" : `${fillPercentage}%` }}
				>
					<StarIcon
						data-slot="rating-star-filled"
						className={cn(starVariants({ size }), "fill-yellow-400 text-yellow-400")}
						aria-hidden
					/>
				</div>
			</>
		);

		if (editable) {
			stars.push(
				<button
					key={i}
					type="button"
					className={starClass}
					aria-label={`${i} star${i === 1 ? "" : "s"}`}
					onClick={(event) => {
						commitValue(valueFromPointer(i, event.clientX, event.currentTarget));
					}}
					onMouseMove={(event) => {
						setHoveredRating(valueFromPointer(i, event.clientX, event.currentTarget));
					}}
					onMouseLeave={() => setHoveredRating(null)}
				>
					{starBody}
				</button>,
			);
		} else {
			stars.push(
				<span key={i} className={starClass}>
					{starBody}
				</span>,
			);
		}
	}

	return (
		<div data-slot="rating" className={cn(ratingVariants({ size }), className)} {...props}>
			<span className="sr-only">
				{editable ? "Rating" : `Rated ${displayRating} out of ${maxRating}`}
			</span>
			<div className="flex items-center gap-0.5">{stars}</div>
			{showValue ? (
				<span data-slot="rating-value" className={cn(valueVariants({ size }), starClassName)}>
					{displayRating.toFixed(1)}
				</span>
			) : null}
		</div>
	);
}

export { Rating };
