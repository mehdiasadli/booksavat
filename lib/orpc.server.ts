import "server-only";

import { createRouterClient } from "@orpc/server";
import { headers } from "next/headers";

import { router } from "@/server";

/**
 * Publishes an in-process client for SSR. Imported from `instrumentation.ts` and
 * the root layout so it is installed before any component renders.
 *
 * The client is shared across requests, so per-request values are resolved lazily
 * inside the context function rather than captured once.
 */
globalThis.$client = createRouterClient(router, {
	context: async () => ({ headers: await headers() }),
});
