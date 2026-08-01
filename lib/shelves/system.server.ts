import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import type { Database } from "@/db";
import { shelf } from "@/db/schema";
import { SYSTEM_SHELF_DEFINITIONS } from "@/lib/shelves/constants";

/**
 * Idempotently ensure the four system shelves exist for a user.
 * Safe to call on signup and on every shelf API entrypoint.
 */
export async function ensureSystemShelves(db: Database, userId: string): Promise<void> {
	const existing = await db
		.select({ systemKey: shelf.systemKey })
		.from(shelf)
		.where(
			and(
				eq(shelf.userId, userId),
				inArray(
					shelf.systemKey,
					SYSTEM_SHELF_DEFINITIONS.map((definition) => definition.systemKey),
				),
			),
		);

	const have = new Set(existing.map((row) => row.systemKey).filter(Boolean));
	const missing = SYSTEM_SHELF_DEFINITIONS.filter((definition) => !have.has(definition.systemKey));

	if (missing.length === 0) {
		return;
	}

	const now = new Date();

	await db.insert(shelf).values(
		missing.map((definition) => ({
			userId,
			name: definition.name,
			slug: definition.slug,
			visibility: "private" as const,
			isSystem: true,
			systemKey: definition.systemKey,
			isOrdered: false,
			position: definition.position,
			createdAt: now,
			updatedAt: now,
		})),
	);
}

/** Count shelves for a user; used to decide whether ensure is needed. */
export async function countUserShelves(db: Database, userId: string): Promise<number> {
	const [row] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(shelf)
		.where(eq(shelf.userId, userId));

	return row?.count ?? 0;
}
