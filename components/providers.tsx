"use client";

import { NuqsAdapter } from "nuqs/adapters/next/app";

import { QueryProvider } from "@/components/query-provider";
import { ThemeProvider } from "@/components/theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<QueryProvider>
			<NuqsAdapter>
				<ThemeProvider>{children}</ThemeProvider>
			</NuqsAdapter>
		</QueryProvider>
	);
}
