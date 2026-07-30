import { implement } from "@orpc/server";

import type { ORPCContext } from "@/server/context";
import { contract } from "@/server/contracts";
import {
	dbProviderMiddleware,
	loggerMiddleware,
	requireRoleMiddleware,
	requireViewerMiddleware,
	sessionProviderMiddleware,
} from "@/server/middlewares";

/**
 * Contract-first entry point: every procedure below is bound to `contract`, so a
 * handler that drifts from its declared input/output/errors fails to compile.
 */
export const implementer = implement(contract).$context<ORPCContext>();

/**
 * Base pipeline. The order is deliberate — oRPC only dedupes middlewares that
 * appear as a leading, same-order subset, so keep new shared middleware appended
 * here rather than inserted in the middle.
 */
export const publicProcedure = implementer
	.use(loggerMiddleware)
	.use(dbProviderMiddleware)
	.use(sessionProviderMiddleware);

/** Requires a signed-in user; adds `context.viewer`. */
export const protectedProcedure = publicProcedure.use(requireViewerMiddleware);

/** Requires a specific role; adds `context.role`. */
export const moderatorProcedure = protectedProcedure.use(
	requireRoleMiddleware("admin", "moderator"),
);

export const adminProcedure = protectedProcedure.use(requireRoleMiddleware("admin"));
