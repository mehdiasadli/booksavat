import type { ShelfVisibility } from "@/lib/shelves/constants";

/**
 * Whether a viewer may see a private account's content (shelves, diary, feedback).
 * Public accounts are always visible; private accounts require an accepted follow.
 */
export function canViewProfileContent(options: {
	isPrivate: boolean;
	ownerUserId: string;
	viewerUserId?: string | null;
	viewerFollowsOwner?: boolean;
}): boolean {
	const { isPrivate, ownerUserId, viewerUserId, viewerFollowsOwner } = options;

	if (viewerUserId && viewerUserId === ownerUserId) {
		return true;
	}

	if (!isPrivate) {
		return true;
	}

	return Boolean(viewerFollowsOwner);
}

/**
 * Whether a viewer can see a shelf.
 * `followers_only` requires an accepted follow from the viewer to the owner.
 */
export function canViewShelf(options: {
	visibility: ShelfVisibility;
	ownerUserId: string;
	viewerUserId?: string | null;
	viewerFollowsOwner?: boolean;
}): boolean {
	const { visibility, ownerUserId, viewerUserId, viewerFollowsOwner } = options;

	if (viewerUserId && viewerUserId === ownerUserId) {
		return true;
	}

	if (visibility === "public") {
		return true;
	}

	if (visibility === "followers_only") {
		return Boolean(viewerFollowsOwner);
	}

	return false;
}
