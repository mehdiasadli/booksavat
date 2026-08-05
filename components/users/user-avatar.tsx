import Image from "next/image";

import { cn } from "@/lib/utils";

type AvatarSize = "sm" | "md" | "lg" | "xl";

interface UserAvatarProps {
	name: string;
	image: string | null;
	className?: string;
	size?: AvatarSize;
	priority?: boolean;
}

const sizeMap: Record<AvatarSize, { className: string; px: number; text: string }> = {
	sm: { className: "size-8", px: 32, text: "text-xs" },
	md: { className: "size-10", px: 40, text: "text-sm" },
	lg: { className: "size-24", px: 96, text: "text-xl" },
	xl: { className: "size-32", px: 128, text: "text-2xl" },
};

function getInitials(name: string): string {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");
}

export function UserAvatar({
	name,
	image,
	className,
	size = "xl",
	priority = false,
}: UserAvatarProps) {
	const config = sizeMap[size];

	if (image) {
		return (
			<Image
				src={image}
				alt={`${name}'s profile picture`}
				width={config.px}
				height={config.px}
				className={cn("object-cover ring-1 ring-foreground/10", config.className, className)}
				priority={priority}
			/>
		);
	}

	return (
		<div
			aria-hidden="true"
			className={cn(
				"flex items-center justify-center bg-muted font-heading font-semibold text-muted-foreground ring-1 ring-foreground/10",
				config.className,
				config.text,
				className,
			)}
		>
			{getInitials(name) || "?"}
		</div>
	);
}
