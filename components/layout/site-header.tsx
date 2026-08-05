"use client";

import { Loader2, LogIn, LogOut, Menu, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { BookSearch } from "@/components/books/book-search";
import { BrandIcon, BrandWordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { authClient } from "@/lib/auth-client";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

const navItems = [
	{ href: "/", label: "Home" },
	{ href: "/books", label: "Books" },
] as const;

export function SiteHeader() {
	const pathname = usePathname();
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();
	const [mobileOpen, setMobileOpen] = useState(false);
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	async function logout() {
		setIsLoggingOut(true);
		try {
			const { error } = await authClient.signOut();
			if (error) {
				throw new Error(error.message);
			}
			router.push("/login");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to log out");
		} finally {
			setIsLoggingOut(false);
		}
	}

	return (
		<header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
			<div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:gap-4 sm:px-6">
				<Link href="/" className="hidden shrink-0 sm:block" aria-label={APP_NAME}>
					<BrandWordmark title={APP_NAME} className="h-6 w-auto" />
				</Link>
				<Link href="/" className="shrink-0 sm:hidden" aria-label={APP_NAME}>
					<BrandIcon title={APP_NAME} className="size-8 rounded-sm" />
				</Link>

				<nav className="hidden items-center gap-1 md:flex">
					{navItems.map((item) => {
						const active =
							item.href === "/"
								? pathname === "/"
								: pathname === item.href || pathname.startsWith(`${item.href}/`);

						return (
							<Button
								key={item.href}
								variant={active ? "secondary" : "ghost"}
								size="sm"
								nativeButton={false}
								render={<Link href={item.href}>{item.label}</Link>}
							/>
						);
					})}
				</nav>

				<div className="min-w-0 flex-1">
					<BookSearch />
				</div>

				<div className="hidden items-center gap-1 sm:flex">
					{isPending ? (
						<Loader2 className="size-4 animate-spin text-muted-foreground" />
					) : session?.user ? (
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<Button variant="ghost" size="sm" className="gap-2">
										<UserRound className="size-4" />
										<span className="max-w-28 truncate">{session.user.username}</span>
									</Button>
								}
							/>
							<DropdownMenuContent align="end" className="min-w-48">
								<DropdownMenuGroup>
									<DropdownMenuLabel className="font-normal">
										<div className="truncate font-medium">{session.user.name}</div>
										<div className="truncate text-xs text-muted-foreground">
											@{session.user.username}
										</div>
									</DropdownMenuLabel>
								</DropdownMenuGroup>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									render={<Link href={`/users/${session.user.username}`}>Profile</Link>}
								/>
								<DropdownMenuItem
									render={<Link href={`/users/${session.user.username}/shelves`}>Shelves</Link>}
								/>
								<DropdownMenuItem
									render={<Link href={`/users/${session.user.username}/diary`}>Diary</Link>}
								/>
								<DropdownMenuItem render={<Link href="/people">People</Link>} />
								<DropdownMenuSeparator />
								<DropdownMenuItem
									disabled={isLoggingOut}
									onClick={() => {
										void logout();
									}}
								>
									{isLoggingOut ? (
										<Loader2 className="size-4 animate-spin" />
									) : (
										<LogOut className="size-4" />
									)}
									Log out
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					) : (
						<Button size="sm" nativeButton={false} render={<Link href="/login">Sign in</Link>} />
					)}
				</div>

				<Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
					<SheetTrigger
						render={
							<Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu" />
						}
					>
						<Menu className="size-5" />
					</SheetTrigger>
					<SheetContent side="right" className="flex w-[min(100%,20rem)] flex-col gap-0 p-0">
						<SheetHeader className="border-b px-4 py-3">
							<SheetTitle className="flex items-center gap-2">
								<BrandIcon title={APP_NAME} className="size-7 rounded-sm" />
								<span>{APP_NAME}</span>
							</SheetTitle>
						</SheetHeader>
						<div className="flex flex-col gap-1 p-3">
							{navItems.map((item) => {
								const active =
									item.href === "/"
										? pathname === "/"
										: pathname === item.href || pathname.startsWith(`${item.href}/`);

								return (
									<Link
										key={item.href}
										href={item.href}
										onClick={() => setMobileOpen(false)}
										className={cn(
											"rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted",
											active && "bg-muted font-medium",
										)}
									>
										{item.label}
									</Link>
								);
							})}
						</div>
						<div className="mt-auto border-t p-3">
							{isPending ? (
								<div className="flex justify-center py-2">
									<Loader2 className="size-4 animate-spin text-muted-foreground" />
								</div>
							) : session?.user ? (
								<div className="flex flex-col gap-2">
									<Button
										variant="outline"
										nativeButton={false}
										render={
											<Link
												href={`/users/${session.user.username}`}
												onClick={() => setMobileOpen(false)}
											>
												<UserRound className="size-4" />
												Profile
											</Link>
										}
									/>
									<Button
										variant="outline"
										nativeButton={false}
										render={
											<Link
												href={`/users/${session.user.username}/shelves`}
												onClick={() => setMobileOpen(false)}
											>
												Shelves
											</Link>
										}
									/>
									<Button
										variant="outline"
										nativeButton={false}
										render={
											<Link
												href={`/users/${session.user.username}/diary`}
												onClick={() => setMobileOpen(false)}
											>
												Diary
											</Link>
										}
									/>
									<Button
										variant="outline"
										nativeButton={false}
										render={
											<Link href="/people" onClick={() => setMobileOpen(false)}>
												People
											</Link>
										}
									/>
									<Button
										variant="ghost"
										loading={isLoggingOut}
										loadingText="Logging out…"
										onClick={() => {
											void logout();
										}}
									>
										<LogOut className="size-4" />
										Log out
									</Button>
								</div>
							) : (
								<Button
									nativeButton={false}
									render={
										<Link href="/login" onClick={() => setMobileOpen(false)}>
											<LogIn className="size-4" />
											Sign in
										</Link>
									}
								/>
							)}
						</div>
					</SheetContent>
				</Sheet>
			</div>
		</header>
	);
}
