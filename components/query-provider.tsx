"use client";

import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { makeQueryClient } from "@/lib/query-client";

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
	// On the server every render needs its own client; in the browser the cache has
	// to survive re-renders, so it is created once and reused.
	if (typeof window === "undefined") {
		return makeQueryClient();
	}

	browserQueryClient ??= makeQueryClient();

	return browserQueryClient;
}

export function QueryProvider({ children }: { children: ReactNode }) {
	return <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>;
}
