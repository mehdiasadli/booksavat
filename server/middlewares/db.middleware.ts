import { os } from "@orpc/server";

import type { Database } from "@/db";

/**
 * Puts a `db` on the context, reusing one that is already there.
 *
 * Reuse is what makes this safe to apply at several levels of the router without
 * paying for it twice (see oRPC's dedupe-middleware guidance). The import is lazy
 * so procedures that never touch the database — and tests that inject a stub —
 * don't pull in the connection module or require DATABASE_URL.
 */
export const dbProviderMiddleware = os
	.$context<{ db?: Database }>()
	.middleware(async ({ context, next }) => {
		const db = context.db ?? (await import("@/db")).db;

		return next({ context: { db } });
	});
