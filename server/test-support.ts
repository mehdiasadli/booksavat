import type { Database } from "@/db";
import type { ORPCContext, SessionPayload, Viewer } from "@/server/context";
import type { User, UserRole } from "@/server/contracts";

/**
 * Test fixtures for the oRPC pipeline.
 *
 * Procedures resolve their database client and session from context when present,
 * so these helpers let a test drive a real procedure — middleware, validation and
 * all — without a Postgres connection or a better-auth instance.
 */

export function makeViewer(overrides: Partial<User> = {}): Viewer {
	const user = {
		id: "11111111-1111-4111-8111-111111111111",
		name: "Ada Lovelace",
		email: "ada@example.com",
		image: null,
		role: "user" satisfies UserRole,
		createdAt: new Date("2026-01-01T00:00:00.000Z"),
		updatedAt: new Date("2026-01-01T00:00:00.000Z"),
		emailVerified: true,
		...overrides,
	};

	return {
		user,
		session: {
			id: "22222222-2222-4222-8222-222222222222",
			token: "session-token",
			userId: user.id,
			expiresAt: new Date("2026-12-31T00:00:00.000Z"),
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		},
	} as unknown as Viewer;
}

interface StubDatabaseOptions {
	rows?: unknown[];
	total?: number;
	updated?: unknown[];
}

/** Minimal stand-in for the drizzle query builders the user routes use. */
export function stubDatabase({ rows = [], total = 0, updated = [] }: StubDatabaseOptions = {}) {
	const selectChain = {
		from: () => selectChain,
		where: () => selectChain,
		orderBy: () => selectChain,
		limit: () => selectChain,
		offset: () => Promise.resolve(rows),
	};

	const updateChain = {
		set: () => updateChain,
		where: () => updateChain,
		returning: () => Promise.resolve(updated),
	};

	return {
		select: () => selectChain,
		update: () => updateChain,
		$count: () => Promise.resolve(total),
	} as unknown as Database;
}

export function createTestContext(
	overrides: Partial<ORPCContext> & { session?: SessionPayload } = {},
): ORPCContext {
	return {
		headers: new Headers(),
		db: stubDatabase(),
		session: null,
		...overrides,
	};
}
