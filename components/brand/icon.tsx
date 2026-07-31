import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

export type BrandIconProps = SVGProps<SVGSVGElement> & {
	title?: string;
};

export function BrandIcon({ className, title, ...props }: BrandIconProps) {
	return (
		<svg
			viewBox="0 0 1024 1024"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={cn("size-8 shrink-0", className)}
			role={title ? "img" : undefined}
			aria-hidden={title ? undefined : true}
			{...props}
		>
			{title ? <title>{title}</title> : null}
			<rect width="1024" height="1024" fill="#F0B100" />
			<rect x="512" width="512" height="1024" fill="#FFC41D" />
			<rect x="768" width="256" height="1024" fill="#FFD04D" />
			<rect x="896" width="128" height="1024" fill="#FFDD7E" />
			<rect x="960" width="64" height="1024" fill="#FFECB8" />
			<rect x="992" width="32" height="1024" fill="white" />
			<path d="M897 1024L1024 960V1024H960H897Z" fill="white" />
		</svg>
	);
}
