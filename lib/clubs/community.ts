import type { ClubMemberRole } from "@/lib/clubs/constants";
import type { ViewerMembership } from "@/lib/clubs/visibility";

export const COMMUNITY_POST_TITLE_MAX = 200;
export const COMMUNITY_POST_SLUG_MAX = 48;
export const COMMUNITY_POST_BODY_PLAIN_MAX = 20_000;
export const COMMUNITY_COMMENT_BODY_PLAIN_MAX = 5000;
export const COMMUNITY_COMMENT_MAX_DEPTH = 5;
export const COMMUNITY_FEED_PAGE_SIZE = 20;
export const COMMUNITY_MAX_ATTACHMENTS = 8;

export const CLUB_CAN_POST_OPTIONS = ["all_members", "moderators", "admin_only"] as const;
export type ClubCanPost = (typeof CLUB_CAN_POST_OPTIONS)[number];

export const CLUB_POST_TYPES = ["discussion", "announcement", "system"] as const;
export type ClubPostType = (typeof CLUB_POST_TYPES)[number];

export type ClubCommunitySettings = {
	communityEnabled: boolean;
	canPost: ClubCanPost;
	defaultCanPeopleComment: boolean;
	defaultCanPeopleReact: boolean;
};

export const DEFAULT_CLUB_COMMUNITY_SETTINGS: ClubCommunitySettings = {
	communityEnabled: true,
	canPost: "all_members",
	defaultCanPeopleComment: true,
	defaultCanPeopleReact: true,
};

export function isActiveMember(membership: ViewerMembership): boolean {
	return membership?.status === "active";
}

export function canModerateCommunity(membership: ViewerMembership): boolean {
	return Boolean(
		membership &&
			membership.status === "active" &&
			(membership.role === "admin" || membership.role === "moderator"),
	);
}

export function canAnnounce(membership: ViewerMembership): boolean {
	return canModerateCommunity(membership);
}

export function canCreateCommunityPost(
	membership: ViewerMembership,
	canPost: ClubCanPost,
	postType: ClubPostType,
): boolean {
	if (!isActiveMember(membership) || !membership) return false;
	if (postType === "system") return false;
	if (postType === "announcement") return canAnnounce(membership);

	if (membership.role === "admin") return true;
	if (canPost === "admin_only") return false;
	if (canPost === "moderators") {
		return membership.role === "moderator";
	}
	return true;
}

export function nextCommentDepth(parentDepth: number | null): number | null {
	if (parentDepth == null) return 0;
	if (parentDepth >= COMMUNITY_COMMENT_MAX_DEPTH) return null;
	return parentDepth + 1;
}

export type CommunityCursorPayload = {
	sort: "hot" | "top" | "new";
	pinned: boolean;
	score: number;
	createdAt: string;
	id: string;
};

export function encodeCommunityCursor(payload: CommunityCursorPayload): string {
	return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeCommunityCursor(cursor: string): CommunityCursorPayload | null {
	try {
		const raw = Buffer.from(cursor, "base64url").toString("utf8");
		const parsed = JSON.parse(raw) as CommunityCursorPayload;
		if (
			!parsed ||
			(parsed.sort !== "hot" && parsed.sort !== "top" && parsed.sort !== "new") ||
			typeof parsed.pinned !== "boolean" ||
			typeof parsed.score !== "number" ||
			typeof parsed.createdAt !== "string" ||
			typeof parsed.id !== "string"
		) {
			return null;
		}
		return parsed;
	} catch {
		return null;
	}
}

export function authorRoleMatches(
	role: ClubMemberRole | null | undefined,
	filter: ClubMemberRole | undefined,
): boolean {
	if (!filter) return true;
	return role === filter;
}
