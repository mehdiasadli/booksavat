import { BookOpen } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";

type BookCoverSize = "sm" | "md" | "lg" | "xl";

const sizeClass: Record<BookCoverSize, string> = {
	sm: "h-16 w-11",
	md: "h-28 w-20",
	lg: "h-48 w-32",
	xl: "h-72 w-48",
};

interface BookCoverProps {
	src?: string | null;
	alt: string;
	size?: BookCoverSize;
	className?: string;
	priority?: boolean;
}

export function BookCover({ src, alt, size = "md", className, priority }: BookCoverProps) {
	return (
		<div
			className={cn(
				"relative shrink-0 overflow-hidden rounded-sm bg-muted ring-1 ring-foreground/10",
				sizeClass[size],
				className,
			)}
		>
			{src ? (
				<Image
					src={src}
					alt={alt}
					fill
					sizes={
						size === "xl" ? "192px" : size === "lg" ? "128px" : size === "md" ? "80px" : "44px"
					}
					className="object-cover"
					priority={priority}
				/>
			) : (
				<div className="flex h-full w-full items-center justify-center text-muted-foreground">
					<BookOpen
						className={cn(size === "sm" ? "size-4" : size === "md" ? "size-6" : "size-10")}
						aria-hidden
					/>
					<span className="sr-only">{alt}</span>
				</div>
			)}
		</div>
	);
}
