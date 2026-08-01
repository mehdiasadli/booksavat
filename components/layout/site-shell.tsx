import { SiteHeader } from "@/components/layout/site-header";

export function SiteShell({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex min-h-svh flex-col bg-background text-foreground">
			<SiteHeader />
			<main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
		</div>
	);
}
