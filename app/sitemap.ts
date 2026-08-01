import type { MetadataRoute } from "next";

import { db } from "@/db";
import { user } from "@/db/schema";
import { absoluteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

	return [...staticRoutes, ...profileRoutes];
}
