import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { UserProfile } from "@/components/users/user-profile";
import { buildUserProfileMetadata, getPublicUserProfile } from "@/lib/users/profile.server";

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
	const user = await getPublicUserProfile(username);

	if (!user) {
		notFound();
	}

	return <UserProfile user={user} />;
}
