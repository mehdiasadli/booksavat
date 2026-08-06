"use client";

import { REACTION_EMOJIS } from "@/lib/reactions";
import { cn } from "@/lib/utils";

export type CommunityReaction = {
	emoji: string;
	count: number;
	reactedByViewer: boolean;
};

export function CommunityReactions({
	reactions,
	disabled,
	onToggle,
	className,
}: {
	reactions: CommunityReaction[];
	disabled?: boolean;
	onToggle: (emoji: string) => void;
	className?: string;
}) {
	const counts = new Map(reactions.map((reaction) => [reaction.emoji, reaction]));

	return (
		<div className={cn("flex flex-wrap gap-1", className)}>
			{REACTION_EMOJIS.map((emoji) => {
				const entry = counts.get(emoji);
				return (
					<button
						key={emoji}
						type="button"
						disabled={disabled}
						onClick={() => onToggle(emoji)}
						className={cn(
							"rounded-md border px-2 py-0.5 text-sm transition-colors",
							entry?.reactedByViewer
								? "border-primary bg-primary/10"
								: "border-border hover:bg-muted/50",
							"disabled:opacity-50",
						)}
					>
						{emoji}
						{entry && entry.count > 0 ? (
							<span className="ml-1 text-xs text-muted-foreground">{entry.count}</span>
						) : null}
					</button>
				);
			})}
		</div>
	);
}
