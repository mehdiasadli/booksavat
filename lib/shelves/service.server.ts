import "server-only";

import { and, asc, desc, eq, inArray, max, ne, sql } from "drizzle-orm";

import type { Database } from "@/db";
import { shelf, shelfItem, user } from "@/db/schema";
import { coverUrlFromCoverId } from "@/lib/books/covers";
import { normalizeWorkKey, toWorkId } from "@/lib/books/ids";
import {
	RESERVED_SHELF_SLUGS,
	type ShelfVisibility,
	type SystemShelfKey,
} from "@/lib/shelves/constants";
import { ensureSystemShelves } from "@/lib/shelves/system.server";
import { canViewShelf } from "@/lib/shelves/visibility";
import { generateUniqueSlug, isValidSlug, slugify } from "@/lib/slugify";
import { olib } from "@/olib";

export type ShelfRow = typeof shelf.$inferSelect;
export type ShelfItemRow = typeof shelfItem.$inferSelect;

export type ShelfSummary = {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	visibility: ShelfVisibility;
	isSystem: boolean;
	systemKey: SystemShelfKey | null;
	isOrdered: boolean;
	position: number;
	itemCount: number;
	createdAt: Date;
	updatedAt: Date;
};

export type ShelfItemPreview = {
	id: string;
	workId: string;
	position: number;
	title: string;
	coverUrl: string | null;
	authors: string[];
	addedAt: Date;
};

async function requireUserByUsername(db: Database, username: string) {
	const [row] = await db
		.select({ id: user.id, username: user.username })
		.from(user)
		.where(eq(user.username, username))
		.limit(1);

	if (!row) {
		return null;
	}

	return row;
}

async function getOwnedShelf(db: Database, shelfId: string, ownerUserId: string) {
	const [row] = await db
		.select()
		.from(shelf)
		.where(and(eq(shelf.id, shelfId), eq(shelf.userId, ownerUserId)))
		.limit(1);

	return row ?? null;
}

async function nextCustomShelfPosition(db: Database, userId: string): Promise<number> {
	const [row] = await db
		.select({ maxPosition: max(shelf.position) })
		.from(shelf)
		.where(eq(shelf.userId, userId));

	return (row?.maxPosition ?? 3) + 1;
}

export async function toShelfSummary(db: Database, row: ShelfRow): Promise<ShelfSummary> {
	const [countRow] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(shelfItem)
		.where(eq(shelfItem.shelfId, row.id));

	return {
		id: row.id,
		name: row.name,
		slug: row.slug,
		description: row.description,
		visibility: row.visibility,
		isSystem: row.isSystem,
		systemKey: row.systemKey,
		isOrdered: row.isOrdered,
		position: row.position,
		itemCount: countRow?.count ?? 0,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

async function hydrateWorkPreview(workId: string): Promise<{
	title: string;
	coverUrl: string | null;
	authors: string[];
}> {
	try {
		const work = await olib.works.get(workId);
		return {
			title: work.title?.trim() || "Untitled",
			coverUrl: coverUrlFromCoverId(work.covers?.[0], "M"),
			authors: [],
		};
	} catch {
		return {
			title: "Unknown work",
			coverUrl: null,
			authors: [],
		};
	}
}

export async function listShelvesByUsername(
	db: Database,
	username: string,
	viewerUserId?: string | null,
): Promise<{ ownerUsername: string; shelves: ShelfSummary[] } | null> {
	const owner = await requireUserByUsername(db, username);
	if (!owner) {
		return null;
	}

	await ensureSystemShelves(db, owner.id);

	const rows = await db
		.select()
		.from(shelf)
		.where(eq(shelf.userId, owner.id))
		.orderBy(asc(shelf.position), asc(shelf.createdAt));

	const visible = rows.filter((row) =>
		canViewShelf({
			visibility: row.visibility,
			ownerUserId: owner.id,
			viewerUserId,
		}),
	);

	const shelves = await Promise.all(visible.map((row) => toShelfSummary(db, row)));

	return { ownerUsername: owner.username, shelves };
}

export async function getShelfByUsernameAndSlug(
	db: Database,
	username: string,
	slug: string,
	viewerUserId: string | null | undefined,
	pagination: { limit: number; offset: number },
): Promise<{
	ownerUsername: string;
	shelf: ShelfSummary;
	items: ShelfItemPreview[];
	total: number;
	nextOffset: number | null;
} | null> {
	const owner = await requireUserByUsername(db, username);
	if (!owner) {
		return null;
	}

	await ensureSystemShelves(db, owner.id);

	const [row] = await db
		.select()
		.from(shelf)
		.where(and(eq(shelf.userId, owner.id), eq(shelf.slug, slug)))
		.limit(1);

	if (!row) {
		return null;
	}

	if (
		!canViewShelf({
			visibility: row.visibility,
			ownerUserId: owner.id,
			viewerUserId,
		})
	) {
		return null;
	}

	const [countRow] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(shelfItem)
		.where(eq(shelfItem.shelfId, row.id));

	const total = countRow?.count ?? 0;

	const itemRows = await db
		.select()
		.from(shelfItem)
		.where(eq(shelfItem.shelfId, row.id))
		.orderBy(asc(shelfItem.position), desc(shelfItem.createdAt))
		.limit(pagination.limit)
		.offset(pagination.offset);

	const items: ShelfItemPreview[] = await Promise.all(
		itemRows.map(async (item) => {
			const preview = await hydrateWorkPreview(item.workId);
			return {
				id: item.id,
				workId: item.workId,
				position: item.position,
				title: preview.title,
				coverUrl: preview.coverUrl,
				authors: preview.authors,
				addedAt: item.createdAt,
			};
		}),
	);

	const consumed = pagination.offset + items.length;

	return {
		ownerUsername: owner.username,
		shelf: await toShelfSummary(db, row),
		items,
		total,
		nextOffset: consumed < total ? consumed : null,
	};
}

export async function createCustomShelf(
	db: Database,
	ownerUserId: string,
	input: {
		name: string;
		description?: string | null;
		visibility?: ShelfVisibility;
		isOrdered?: boolean;
	},
): Promise<ShelfSummary> {
	await ensureSystemShelves(db, ownerUserId);

	const name = input.name.trim();
	if (!name) {
		throw new Error("Shelf name is required");
	}

	const slug = await generateUniqueSlug(name, async (candidate) => {
		if (RESERVED_SHELF_SLUGS.has(candidate)) {
			return true;
		}

		const [existing] = await db
			.select({ id: shelf.id })
			.from(shelf)
			.where(and(eq(shelf.userId, ownerUserId), eq(shelf.slug, candidate)))
			.limit(1);

		return Boolean(existing);
	});

	if (!isValidSlug(slug)) {
		throw new Error("Could not generate a valid shelf slug from that name");
	}

	const now = new Date();
	const position = await nextCustomShelfPosition(db, ownerUserId);

	const [created] = await db
		.insert(shelf)
		.values({
			userId: ownerUserId,
			name,
			slug,
			description: input.description?.trim() || null,
			visibility: input.visibility ?? "private",
			isSystem: false,
			systemKey: null,
			isOrdered: input.isOrdered ?? false,
			position,
			createdAt: now,
			updatedAt: now,
		})
		.returning();

	return toShelfSummary(db, created);
}

export async function updateShelf(
	db: Database,
	ownerUserId: string,
	shelfId: string,
	input: {
		name?: string;
		description?: string | null;
		visibility?: ShelfVisibility;
		isOrdered?: boolean;
		regenerateSlug?: boolean;
	},
): Promise<ShelfSummary | null> {
	const existing = await getOwnedShelf(db, shelfId, ownerUserId);
	if (!existing) {
		return null;
	}

	const updates: Partial<typeof shelf.$inferInsert> = {
		updatedAt: new Date(),
	};

	if (input.name !== undefined) {
		const name = input.name.trim();
		if (!name) {
			throw new Error("Shelf name is required");
		}
		updates.name = name;

		if (input.regenerateSlug && !existing.isSystem) {
			updates.slug = await generateUniqueSlug(name, async (candidate) => {
				if (RESERVED_SHELF_SLUGS.has(candidate) && candidate !== existing.slug) {
					return true;
				}

				const [conflict] = await db
					.select({ id: shelf.id })
					.from(shelf)
					.where(
						and(eq(shelf.userId, ownerUserId), eq(shelf.slug, candidate), ne(shelf.id, shelfId)),
					)
					.limit(1);

				return Boolean(conflict);
			});
		}
	}

	if (input.description !== undefined) {
		updates.description = input.description?.trim() || null;
	}

	if (input.visibility !== undefined) {
		updates.visibility = input.visibility;
	}

	if (input.isOrdered !== undefined) {
		updates.isOrdered = input.isOrdered;
	}

	const [updated] = await db.update(shelf).set(updates).where(eq(shelf.id, shelfId)).returning();

	return updated ? toShelfSummary(db, updated) : null;
}

export async function deleteShelf(
	db: Database,
	ownerUserId: string,
	shelfId: string,
): Promise<"ok" | "not_found" | "system"> {
	const existing = await getOwnedShelf(db, shelfId, ownerUserId);
	if (!existing) {
		return "not_found";
	}

	if (existing.isSystem) {
		return "system";
	}

	await db.delete(shelf).where(eq(shelf.id, shelfId));
	return "ok";
}

export async function addWorkToShelf(
	db: Database,
	ownerUserId: string,
	shelfId: string,
	rawWorkId: string,
): Promise<ShelfItemPreview | null> {
	const target = await getOwnedShelf(db, shelfId, ownerUserId);
	if (!target) {
		return null;
	}

	const workId = toWorkId(rawWorkId);

	await db.transaction(async (tx) => {
		if (target.isSystem && target.systemKey) {
			const systemShelves = await tx
				.select({ id: shelf.id })
				.from(shelf)
				.where(
					and(eq(shelf.userId, ownerUserId), eq(shelf.isSystem, true), ne(shelf.id, target.id)),
				);

			const otherIds = systemShelves.map((row) => row.id);
			if (otherIds.length > 0) {
				await tx
					.delete(shelfItem)
					.where(and(inArray(shelfItem.shelfId, otherIds), eq(shelfItem.workId, workId)));
			}
		}

		const [existingItem] = await tx
			.select()
			.from(shelfItem)
			.where(and(eq(shelfItem.shelfId, target.id), eq(shelfItem.workId, workId)))
			.limit(1);

		if (existingItem) {
			return;
		}

		const [maxRow] = await tx
			.select({ maxPosition: max(shelfItem.position) })
			.from(shelfItem)
			.where(eq(shelfItem.shelfId, target.id));
		const position = (maxRow?.maxPosition ?? -1) + 1;
		const now = new Date();

		await tx.insert(shelfItem).values({
			shelfId: target.id,
			workId,
			position,
			createdAt: now,
			updatedAt: now,
		});

		await tx.update(shelf).set({ updatedAt: now }).where(eq(shelf.id, target.id));
	});

	const [item] = await db
		.select()
		.from(shelfItem)
		.where(and(eq(shelfItem.shelfId, target.id), eq(shelfItem.workId, workId)))
		.limit(1);

	if (!item) {
		return null;
	}

	const preview = await hydrateWorkPreview(workId);
	return {
		id: item.id,
		workId: item.workId,
		position: item.position,
		title: preview.title,
		coverUrl: preview.coverUrl,
		authors: preview.authors,
		addedAt: item.createdAt,
	};
}

export async function removeWorkFromShelf(
	db: Database,
	ownerUserId: string,
	shelfId: string,
	rawWorkId: string,
): Promise<"ok" | "not_found"> {
	const target = await getOwnedShelf(db, shelfId, ownerUserId);
	if (!target) {
		return "not_found";
	}

	const workId = toWorkId(rawWorkId);

	const deleted = await db
		.delete(shelfItem)
		.where(and(eq(shelfItem.shelfId, target.id), eq(shelfItem.workId, workId)))
		.returning({ id: shelfItem.id });

	if (deleted.length === 0) {
		return "not_found";
	}

	await db.update(shelf).set({ updatedAt: new Date() }).where(eq(shelf.id, target.id));
	return "ok";
}

export async function reorderShelfItems(
	db: Database,
	ownerUserId: string,
	shelfId: string,
	workIds: string[],
): Promise<"ok" | "not_found" | "unordered" | "mismatch"> {
	const target = await getOwnedShelf(db, shelfId, ownerUserId);
	if (!target) {
		return "not_found";
	}

	if (!target.isOrdered) {
		return "unordered";
	}

	const normalized = workIds.map((id) => toWorkId(id));
	const existing = await db
		.select({ workId: shelfItem.workId })
		.from(shelfItem)
		.where(eq(shelfItem.shelfId, target.id));

	const existingSet = new Set(existing.map((row) => row.workId));
	if (
		normalized.length !== existingSet.size ||
		normalized.some((id) => !existingSet.has(id)) ||
		new Set(normalized).size !== normalized.length
	) {
		return "mismatch";
	}

	const now = new Date();

	await db.transaction(async (tx) => {
		for (const [index, workId] of normalized.entries()) {
			await tx
				.update(shelfItem)
				.set({ position: index, updatedAt: now })
				.where(and(eq(shelfItem.shelfId, target.id), eq(shelfItem.workId, workId)));
		}

		await tx.update(shelf).set({ updatedAt: now }).where(eq(shelf.id, target.id));
	});

	return "ok";
}

export async function reorderShelves(
	db: Database,
	ownerUserId: string,
	shelfIds: string[],
): Promise<"ok" | "mismatch"> {
	await ensureSystemShelves(db, ownerUserId);

	const existing = await db
		.select({ id: shelf.id })
		.from(shelf)
		.where(eq(shelf.userId, ownerUserId));

	const existingSet = new Set(existing.map((row) => row.id));
	if (
		shelfIds.length !== existingSet.size ||
		shelfIds.some((id) => !existingSet.has(id)) ||
		new Set(shelfIds).size !== shelfIds.length
	) {
		return "mismatch";
	}

	const now = new Date();

	await db.transaction(async (tx) => {
		for (const [index, id] of shelfIds.entries()) {
			await tx
				.update(shelf)
				.set({ position: index, updatedAt: now })
				.where(and(eq(shelf.id, id), eq(shelf.userId, ownerUserId)));
		}
	});

	return "ok";
}

export async function membershipForWork(
	db: Database,
	ownerUserId: string,
	rawWorkId: string,
): Promise<
	Array<{
		shelfId: string;
		slug: string;
		name: string;
		isSystem: boolean;
		systemKey: SystemShelfKey | null;
	}>
> {
	await ensureSystemShelves(db, ownerUserId);
	const workId = toWorkId(rawWorkId);

	const rows = await db
		.select({
			shelfId: shelf.id,
			slug: shelf.slug,
			name: shelf.name,
			isSystem: shelf.isSystem,
			systemKey: shelf.systemKey,
		})
		.from(shelfItem)
		.innerJoin(shelf, eq(shelfItem.shelfId, shelf.id))
		.where(and(eq(shelf.userId, ownerUserId), eq(shelfItem.workId, workId)));

	return rows;
}

export { normalizeWorkKey, slugify };
