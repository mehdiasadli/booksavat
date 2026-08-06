import { isReactionEmoji, REACTION_EMOJIS, type ReactionEmoji } from "@/lib/reactions";

export const SESSION_DISCUSSION_MAX_DEPTH = 5;

/** @deprecated Prefer `REACTION_EMOJIS` from `@/lib/reactions`. */
export const SESSION_DISCUSSION_REACTIONS = REACTION_EMOJIS;
export type SessionDiscussionReactionEmoji = ReactionEmoji;

export const SESSION_DISCUSSION_BODY_PLAIN_MAX = 5000;

export function isSessionDiscussionReaction(
	value: string,
): value is SessionDiscussionReactionEmoji {
	return isReactionEmoji(value);
}

export function canPostSessionDiscussion(status: string): boolean {
	return status === "reviewing";
}

export function canViewSessionDiscussion(status: string): boolean {
	return status === "reviewing" || status === "completed";
}

export function nextDiscussionDepth(parentDepth: number | null): number | null {
	if (parentDepth == null) return 0;
	if (parentDepth >= SESSION_DISCUSSION_MAX_DEPTH) return null;
	return parentDepth + 1;
}

export type DiscussionMessageNode<T extends { id: string; parentId: string | null }> = T & {
	replies: DiscussionMessageNode<T>[];
};

/** Build a depth-first tree from a flat list. Orphans (missing parent) are treated as roots. */
export function buildDiscussionTree<
	T extends { id: string; parentId: string | null; depth: number },
>(messages: readonly T[]): DiscussionMessageNode<T>[] {
	const byId = new Map<string, DiscussionMessageNode<T>>();
	for (const message of messages) {
		byId.set(message.id, { ...message, replies: [] });
	}

	const roots: DiscussionMessageNode<T>[] = [];
	for (const message of messages) {
		const node = byId.get(message.id);
		if (!node) continue;
		if (message.parentId && byId.has(message.parentId)) {
			byId.get(message.parentId)?.replies.push(node);
		} else {
			roots.push(node);
		}
	}
	return roots;
}
