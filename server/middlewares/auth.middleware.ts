import { os } from "@orpc/server";

import type { SessionPayload, Viewer } from "@/server/context";
import { commonErrors } from "@/server/contracts/errors";
import type { UserRole } from "@/server/contracts/user.contract";
import { userRoleSchema } from "@/server/contracts/user.contract";

/**
 * Builder for auth middlewares. Declaring `commonErrors` here is what types the
 * `errors` argument, so guards throw `errors.FORBIDDEN()` instead of raw strings.
 */
const authBase = os.errors(commonErrors);

/**
 * Resolves the session once per request and shares it downstream.
 *
 * A `session` already on the context wins — including an explicit `null`, which
 * means "known to be signed out" and must not trigger another lookup. better-auth
 * is imported lazily so signed-out paths and tests never load it.
 */
export const sessionProviderMiddleware = authBase
	.$context<{ headers: Headers; session?: SessionPayload }>()
	.middleware(async ({ context, next }) => {
		if (context.session !== undefined) {
			return next({ context: { session: context.session } });
		}

		const { auth } = await import("@/lib/auth");
		const session = await auth.api.getSession({ headers: context.headers });

		return next({ context: { session } });
	});

/**
 * Narrows the optional session into a guaranteed `viewer`, so protected handlers
 * read `context.viewer.user` without null checks.
 */
export const requireViewerMiddleware = authBase
	.$context<{ session?: SessionPayload }>()
	.middleware(async ({ context, next, errors }) => {
		if (!context.session?.user || !context.session.session) {
			throw errors.UNAUTHORIZED();
		}

		return next({ context: { viewer: context.session as Viewer } });
	});

/**
 * Role gate, built per call site: `requireRoleMiddleware("admin", "moderator")`.
 *
 * The role column is a Postgres enum but better-auth types additional fields as
 * plain strings, so it is parsed back into the union here.
 */
export function requireRoleMiddleware(...allowed: [UserRole, ...UserRole[]]) {
	return authBase.$context<{ viewer: Viewer }>().middleware(async ({ context, next, errors }) => {
		const role = userRoleSchema.safeParse(context.viewer.user.role);

		if (!role.success || !allowed.includes(role.data)) {
			throw errors.FORBIDDEN({
				message: `This action requires one of these roles: ${allowed.join(", ")}.`,
			});
		}

		return next({ context: { role: role.data } });
	});
}
