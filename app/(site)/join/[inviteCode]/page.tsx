import type { Metadata } from "next";

import { JoinByCode } from "@/components/clubs/join-by-code";
import { getClubByInviteCodePageData } from "@/lib/clubs/queries.server";
import { buildMetadata } from "@/lib/seo";

interface JoinPageProps {
	params: Promise<{ inviteCode: string }>;
}

export const metadata: Metadata = buildMetadata({
	title: "Join club",
	description: "Accept a club invite on BookSavat.",
	path: "/join",
	noIndex: true,
});

export default async function JoinPage({ params }: JoinPageProps) {
	const { inviteCode } = await params;
	const result = await getClubByInviteCodePageData(inviteCode);

	return (
		<JoinByCode
			inviteCode={inviteCode}
			initial={result.ok ? result.data : null}
			previewError={result.ok ? undefined : result.message}
		/>
	);
}
