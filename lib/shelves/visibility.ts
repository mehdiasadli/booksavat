import type { ShelfVisibility } from "@/lib/shelves/constants";

/**
 * Whether a viewer can see a shelf.
 * `followers_only` is treated like private until follows exist.
 */
export function canViewShelf(options: {
	visibility: ShelfVisibility;
	ownerUserId: string;
	viewerUserId?: string | null;
}): boolean {
	const { visibility, ownerUserId, viewerUserId } = options;

	if (viewerUserId && viewerUserId === ownerUserId) {
		return true;
	}

	return visibility === "public";
}
