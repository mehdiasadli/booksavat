export const COMMUNITY_REACTION_WEIGHT = 1;
export const COMMUNITY_COMMENT_WEIGHT = 3;
export const COMMUNITY_REPLY_WEIGHT = 2;
export const COMMUNITY_HOT_AGE_OFFSET_HOURS = 2;
export const COMMUNITY_HOT_GRAVITY = 1.5;

export const COMMUNITY_FEED_SORTS = ["hot", "top", "new"] as const;
export type CommunityFeedSort = (typeof COMMUNITY_FEED_SORTS)[number];

export const COMMUNITY_TOP_RANGES = ["today", "week", "month", "year", "all"] as const;
export type CommunityTopRange = (typeof COMMUNITY_TOP_RANGES)[number];

export function engagementScore(counts: {
	reactionCount: number;
	commentCount: number;
	replyCount: number;
}): number {
	return (
		COMMUNITY_REACTION_WEIGHT * counts.reactionCount +
		COMMUNITY_COMMENT_WEIGHT * counts.commentCount +
		COMMUNITY_REPLY_WEIGHT * counts.replyCount
	);
}

export function ageHours(createdAt: Date, now: Date = new Date()): number {
	return Math.max(0, (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
}

export function hotScore(
	counts: {
		reactionCount: number;
		commentCount: number;
		replyCount: number;
	},
	createdAt: Date,
	now: Date = new Date(),
): number {
	const engagement = engagementScore(counts);
	const age = ageHours(createdAt, now);
	return engagement / (age + COMMUNITY_HOT_AGE_OFFSET_HOURS) ** COMMUNITY_HOT_GRAVITY;
}

export function topRangeStart(range: CommunityTopRange, now: Date = new Date()): Date | null {
	if (range === "all") return null;
	const start = new Date(now);
	switch (range) {
		case "today":
			start.setHours(0, 0, 0, 0);
			return start;
		case "week":
			start.setDate(start.getDate() - 7);
			return start;
		case "month":
			start.setMonth(start.getMonth() - 1);
			return start;
		case "year":
			start.setFullYear(start.getFullYear() - 1);
			return start;
		default:
			return null;
	}
}

/** Truncate a slug to maxLen without leaving a trailing underscore. */
export function truncateSlug(slug: string, maxLen: number): string {
	if (slug.length <= maxLen) return slug;
	const cut = slug.slice(0, maxLen).replace(/_+$/, "");
	return cut.length > 0 ? cut : slug.slice(0, maxLen);
}
