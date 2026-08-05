import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { UserProfileView } from "@/components/users/user-profile";
import {
	buildUserProfileJsonLd,
	buildUserProfileMetadata,
	getPublicUserProfile,
} from "@/lib/users/profile.server";

interface UserPageProps {
	params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: UserPageProps): Promise<Metadata> {
	const { username } = await params;
	const user = await getPublicUserProfile(username);

	if (!user) {
		return {
			title: "User not found",
			robots: {
				index: false,
				follow: false,
			},
		};
	}

	return buildUserProfileMetadata(user);
}

export default async function UserPage({ params }: UserPageProps) {
	const { username } = await params;
	const profile = await getPublicUserProfile(username);

	if (!profile) {
		notFound();
	}

	const jsonLd = buildUserProfileJsonLd(profile);

	return (
		<>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires a script tag.
				dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
			/>
			<UserProfileView profile={profile} />
		</>
	);
}
