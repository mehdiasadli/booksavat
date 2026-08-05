import { Lock } from "lucide-react";

import { cn } from "@/lib/utils";

interface PrivateLockedProps {
	username: string;
	className?: string;
}

export function PrivateLocked({ username, className }: PrivateLockedProps) {
	return (
		<section
			className={cn(
				"flex flex-col items-center gap-3 border border-dashed border-border px-6 py-12 text-center",
				className,
			)}
		>
			<div className="flex size-10 items-center justify-center bg-muted/40">
				<Lock className="size-4 text-muted-foreground" aria-hidden />
			</div>
			<div className="grid gap-1">
				<h2 className="font-heading text-lg font-semibold tracking-tight">
					This account is private
				</h2>
				<p className="max-w-sm text-sm text-muted-foreground text-pretty">
					Follow @{username} and wait for approval to see shelves, diary, and reviews.
				</p>
			</div>
		</section>
	);
}
