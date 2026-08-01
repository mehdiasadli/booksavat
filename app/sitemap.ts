import { eq } from "drizzle-orm";
import type { MetadataRoute } from "next";

import { db } from "@/db";
import { shelf, user } from "@/db/schema";
import { absoluteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	// Keep in sync with public, indexable static routes under app/.
	// Dynamic Open Library work/edition URLs are not enumerated here.
	const staticRoutes: MetadataRoute.Sitemap = [
		{
			url: absoluteUrl("/"),
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 1,
		},
		{
			url: absoluteUrl("/books"),
			lastModified: new Date(),
			changeFrequency: "daily",
			priority: 0.9,
		},
	];

	const users = await db
		.select({
			username: user.username,
			updatedAt: user.updatedAt,
		})
		.from(user);

	const profileRoutes: MetadataRoute.Sitemap = users.map((profile) => ({
		url: absoluteUrl(`/users/${profile.username}`),
		lastModified: profile.updatedAt,
		changeFrequency: "weekly",
		priority: 0.7,
	}));

	const shelvesIndexRoutes: MetadataRoute.Sitemap = users.map((profile) => ({
		url: absoluteUrl(`/users/${profile.username}/shelves`),
		lastModified: profile.updatedAt,
		changeFrequency: "weekly",
		priority: 0.6,
	}));

	const publicShelves = await db
		.select({
			username: user.username,
			slug: shelf.slug,
			updatedAt: shelf.updatedAt,
		})
		.from(shelf)
		.innerJoin(user, eq(shelf.userId, user.id))
		.where(eq(shelf.visibility, "public"));

	const publicShelfRoutes: MetadataRoute.Sitemap = publicShelves.map((row) => ({
		url: absoluteUrl(`/users/${row.username}/shelves/${row.slug}`),
		lastModified: row.updatedAt,
		changeFrequency: "weekly",
		priority: 0.5,
	}));

	return [...staticRoutes, ...profileRoutes, ...shelvesIndexRoutes, ...publicShelfRoutes];
}
