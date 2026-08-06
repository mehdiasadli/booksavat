import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

import { db } from "@/db";
import { auth } from "@/lib/auth";
import { getClubByInviteCode, getClubBySlug } from "@/lib/clubs/service.server";

async function viewerUserId(): Promise<string | null> {
	const session = await auth.api.getSession({ headers: await headers() });
	return session?.user?.id ?? null;
}

export const getClubPageData = cache(async (slug: string) => {
	const viewerId = await viewerUserId();
	return getClubBySlug(db, slug, viewerId);
});

export const getClubByInviteCodePageData = cache(async (inviteCode: string) => {
	const viewerId = await viewerUserId();
	return getClubByInviteCode(db, inviteCode, viewerId);
});
