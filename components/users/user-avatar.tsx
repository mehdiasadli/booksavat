import Image from "next/image";

import { cn } from "@/lib/utils";

interface UserAvatarProps {
	name: string;
	image: string | null;
	className?: string;
	size?: "lg" | "xl";
}

function getInitials(name: string): string {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");
}

export function UserAvatar({ name, image, className, size = "xl" }: UserAvatarProps) {
	const sizeClassName = size === "lg" ? "size-24 text-xl" : "size-32 text-2xl";

	if (image) {
		return (
			<Image
				src={image}
				alt={`${name}'s profile picture`}
				width={size === "lg" ? 96 : 128}
				height={size === "lg" ? 96 : 128}
				className={cn("object-cover ring-1 ring-foreground/10", sizeClassName, className)}
				priority
			/>
		);
	}

	return (
		<div
			aria-hidden="true"
			className={cn(
				"flex items-center justify-center bg-muted font-heading font-semibold text-muted-foreground ring-1 ring-foreground/10",
				sizeClassName,
				className,
			)}
		>
			{getInitials(name) || "?"}
		</div>
	);
}
