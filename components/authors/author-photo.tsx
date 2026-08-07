"use client";

import { UserRound } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

type AuthorPhotoSize = "sm" | "md" | "lg" | "xl";

const sizeClass: Record<AuthorPhotoSize, string> = {
	sm: "size-10",
	md: "size-16",
	lg: "size-28",
	xl: "size-40",
};

interface AuthorPhotoProps {
	src?: string | null;
	alt: string;
	size?: AuthorPhotoSize;
	className?: string;
	priority?: boolean;
}

export function AuthorPhoto({ src, alt, size = "md", className, priority }: AuthorPhotoProps) {
	const [failedSrc, setFailedSrc] = useState<string | null>(null);
	const showImage = Boolean(src) && failedSrc !== src;

	return (
		<div
			className={cn(
				"relative shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-foreground/10",
				sizeClass[size],
				className,
			)}
		>
			{showImage && src ? (
				<Image
					src={src}
					alt={alt}
					fill
					sizes={
						size === "xl" ? "160px" : size === "lg" ? "112px" : size === "md" ? "64px" : "40px"
					}
					className="object-cover"
					priority={priority}
					onError={() => setFailedSrc(src)}
				/>
			) : (
				<div className="flex h-full w-full items-center justify-center text-muted-foreground">
					<UserRound
						className={cn(size === "sm" ? "size-4" : size === "md" ? "size-6" : "size-10")}
						aria-hidden
					/>
					<span className="sr-only">{alt}</span>
				</div>
			)}
		</div>
	);
}
