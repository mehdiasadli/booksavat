import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

import { db } from "@/db";
import { auth } from "@/lib/auth";
import { getShelfByUsernameAndSlug, listShelvesByUsername } from "@/lib/shelves/service.server";

async function viewerUserId(): Promise<string | null> {
	const session = await auth.api.getSession({ headers: await headers() });
	return session?.user?.id ?? null;
}

export const getShelvesPageData = cache(async (username: string) => {
	const viewerId = await viewerUserId();
	return listShelvesByUsername(db, username, viewerId);
});

export const getShelfPageData = cache(
	async (username: string, slug: string, limit = 40, offset = 0) => {
		const viewerId = await viewerUserId();
		return getShelfByUsernameAndSlug(db, username, slug, viewerId, { limit, offset });
	},
);
