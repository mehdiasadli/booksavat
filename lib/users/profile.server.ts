import "server-only";

import { toORPCError } from "@orpc/client";
import type { Metadata } from "next";
import { cache } from "react";

import { APP_NAME } from "@/lib/constants";
import { orpc } from "@/lib/orpc";
import { absoluteUrl } from "@/lib/seo";
import type { UserProfile } from "@/server/contracts";

export function getUserProfileUrl(username: string): string {
	return absoluteUrl(`/users/${username}`);
}

export const getPublicUserProfile = cache(async (username: string): Promise<UserProfile | null> => {
	try {
		return await orpc.follow.getProfile.call({ username });
	} catch (error) {
		const orpcError = toORPCError(error);

		if (orpcError.code === "NOT_FOUND") {
			return null;
		}

		throw orpcError;
	}
});

export function buildUserProfileMetadata(user: UserProfile): Metadata {
	const profileUrl = getUserProfileUrl(user.username);
	const title = `${user.name} (@${user.username})`;
	const description = user.isPrivate
		? `${user.name}'s private reading profile on ${APP_NAME}.`
		: `View ${user.name}'s reading profile on ${APP_NAME}. Discover shelves, sessions, and shared reads.`;

	return {
		title: user.name,
		description,
		alternates: {
			canonical: profileUrl,
		},
		openGraph: {
			type: "profile",
			title,
			description,
			url: profileUrl,
			siteName: APP_NAME,
			...(user.image
				? {
						images: [
							{
								url: user.image,
								alt: `${user.name}'s profile picture`,
							},
						],
					}
				: {}),
		},
		twitter: {
			card: user.image ? "summary_large_image" : "summary",
			title,
			description,
			...(user.image ? { images: [user.image] } : {}),
		},
		robots: {
			index: !user.isPrivate,
			follow: true,
		},
	};
}

export function buildUserProfileJsonLd(user: UserProfile) {
	return {
		"@context": "https://schema.org",
		"@type": "ProfilePage",
		name: `${user.name} (@${user.username})`,
		url: getUserProfileUrl(user.username),
		mainEntity: {
			"@type": "Person",
			name: user.name,
			alternateName: user.username,
			...(user.image ? { image: user.image } : {}),
			url: getUserProfileUrl(user.username),
		},
	};
}
