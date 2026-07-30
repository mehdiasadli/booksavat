import type { Database } from "@/db";
import type { auth } from "@/lib/auth";

/** Whatever better-auth hands back for a request: `null` when nobody is signed in. */
export type SessionPayload = Awaited<ReturnType<typeof auth.api.getSession>>;

/** A session payload that is known to exist. */
export type Viewer = NonNullable<SessionPayload>;

export type ViewerUser = Viewer["user"];

/**
 * Initial context: what an adapter has to hand oRPC before any middleware runs.
 *
 * `db` and `session` are optional injection seams rather than required values.
 * Middleware fills them in when absent, so a caller (a nested `call`, an SSR
 * client, or a test) can pass them once and have every procedure reuse them
 * instead of re-connecting or re-reading the session.
 */
export interface ORPCContext {
	headers: Headers;
	db?: Database;
	session?: SessionPayload;
}
