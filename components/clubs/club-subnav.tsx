"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ClubSubnavProps {
	slug: string;
	showBooklist?: boolean;
	showMembers: boolean;
	showSettings: boolean;
}

export function ClubSubnav({
	slug,
	showBooklist = false,
	showMembers,
	showSettings,
}: ClubSubnavProps) {
	const pathname = usePathname();
	const base = `/clubs/${slug}`;

	const items = [
		{ href: base, label: "Profile", exact: true },
		...(showBooklist ? [{ href: `${base}/booklist`, label: "Booklist", exact: false }] : []),
		...(showMembers ? [{ href: `${base}/members`, label: "Members", exact: false }] : []),
		...(showSettings ? [{ href: `${base}/settings`, label: "Settings", exact: false }] : []),
	];

	return (
		<nav className="flex flex-wrap gap-1 border-b border-border pb-3">
			{items.map((item) => {
				const active = item.exact
					? pathname === item.href
					: pathname === item.href || pathname.startsWith(`${item.href}/`);
				return (
					<Button
						key={item.href}
						size="sm"
						variant={active ? "secondary" : "ghost"}
						nativeButton={false}
						className={cn(!active && "text-muted-foreground")}
						render={<Link href={item.href}>{item.label}</Link>}
					/>
				);
			})}
		</nav>
	);
}
