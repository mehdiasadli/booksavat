export const SYSTEM_SHELF_KEYS = ["wishlist", "reading", "completed", "dnf"] as const;

export type SystemShelfKey = (typeof SYSTEM_SHELF_KEYS)[number];

export const SYSTEM_SHELF_DEFINITIONS = [
	{ systemKey: "wishlist", name: "Wishlist", slug: "wishlist", position: 0 },
	{ systemKey: "reading", name: "Reading", slug: "reading", position: 1 },
	{ systemKey: "completed", name: "Completed", slug: "completed", position: 2 },
	{ systemKey: "dnf", name: "DNF", slug: "dnf", position: 3 },
] as const satisfies ReadonlyArray<{
	systemKey: SystemShelfKey;
	name: string;
	slug: string;
	position: number;
}>;

export const RESERVED_SHELF_SLUGS = new Set<string>(SYSTEM_SHELF_DEFINITIONS.map((d) => d.slug));

export const SHELF_VISIBILITIES = ["private", "followers_only", "public"] as const;

export type ShelfVisibility = (typeof SHELF_VISIBILITIES)[number];
