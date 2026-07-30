import { RocketIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface ComingSoonBlockProps {
	iconClassName?: string;
	icon?: React.ReactNode;
	title?: string;
	description?: string;
	className?: string;
	iconWrapperClassName?: string;
	contentClassName?: string;
	titleClassName?: string;
	descriptionClassName?: string;
}

export default function ComingSoonBlock({
	icon,
	title = "Something great is coming",
	description = "We are putting the finishing touches on it. Leave your email and be the first to know when we launch.",
	className,
	iconWrapperClassName,
	iconClassName,
	contentClassName,
	titleClassName,
	descriptionClassName,
}: ComingSoonBlockProps) {
	const Icon = icon ?? <RocketIcon className={cn("size-6", iconClassName)} aria-hidden="true" />;

	return (
		<section
			className={cn(
				"flex min-h-svh w-full flex-col items-center justify-center gap-8 bg-background px-6 py-12 text-center text-foreground",
				className,
			)}
		>
			<div
				className={cn(
					"flex size-12 items-center justify-center border border-border bg-muted/30",
					iconWrapperClassName,
				)}
			>
				{Icon}
			</div>

			<div className={cn("flex flex-col items-center gap-3", contentClassName)}>
				<h1 className={cn("text-3xl font-bold tracking-tight sm:text-4xl", titleClassName)}>
					{title}
				</h1>
				<p className={cn("max-w-md text-sm text-muted-foreground", descriptionClassName)}>
					{description}
				</p>
			</div>
		</section>
	);
}
