import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

import { db } from "@/db";
import { auth } from "@/lib/auth";
import { listReadingLogsByUsername } from "@/lib/reading-logs/service.server";

async function viewerUserId(): Promise<string | null> {
	const session = await auth.api.getSession({ headers: await headers() });
	return session?.user?.id ?? null;
}

export const getDiaryPageData = cache(async (username: string, limit = 40, offset = 0) => {
	const viewerId = await viewerUserId();
	return listReadingLogsByUsername(db, username, viewerId, { limit, offset });
});
